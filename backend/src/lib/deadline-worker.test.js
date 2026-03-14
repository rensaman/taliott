import { describe, it, expect, vi } from 'vitest';
import { processExpiredEvents, purgeOldEvents, startDeadlineWorker } from './deadline-worker.js';

function makePrisma(events = []) {
  return {
    event: {
      findMany: vi.fn().mockResolvedValue(events),
      update: vi.fn().mockResolvedValue({}),
    },
  };
}

const makeEvent = (overrides = {}) => ({
  id: 'e-1',
  name: 'Past Event',
  organizerEmail: 'alex@example.com',
  adminToken: 'tok-abc',
  status: 'open',
  ...overrides,
});

describe('startDeadlineWorker', () => {
  it('calls processExpiredEvents immediately and returns an interval handle', () => {
    vi.useFakeTimers();
    const prisma = {
      event: {
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn(),
      },
    };
    const mailer = { sendEmail: vi.fn() };
    const getPrisma = vi.fn().mockReturnValue(prisma);

    const handle = startDeadlineWorker(getPrisma, mailer, 5000);

    expect(getPrisma).toHaveBeenCalledOnce();
    expect(typeof handle).toBe('object'); // NodeJS.Timeout

    clearInterval(handle);
    vi.useRealTimers();
  });
});

describe('processExpiredEvents', () => {
  it('locks each expired event', async () => {
    const prisma = makePrisma([makeEvent()]);
    const mailer = { sendEmail: vi.fn().mockResolvedValue(undefined) };

    const count = await processExpiredEvents(prisma, mailer);

    expect(count).toBe(1);
    expect(prisma.event.update).toHaveBeenCalledWith({
      where: { id: 'e-1' },
      data: { status: 'locked' },
    });
  });

  it('emails the organizer for each locked event', async () => {
    const prisma = makePrisma([makeEvent()]);
    const mailer = { sendEmail: vi.fn().mockResolvedValue(undefined) };

    await processExpiredEvents(prisma, mailer);

    expect(mailer.sendEmail).toHaveBeenCalledOnce();
    expect(mailer.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'alex@example.com',
        subject: expect.stringContaining('Past Event'),
      })
    );
  });

  it('locks and emails multiple expired events', async () => {
    const prisma = makePrisma([makeEvent({ id: 'e-1' }), makeEvent({ id: 'e-2', name: 'Other', organizerEmail: 'b@b.com' })]);
    const mailer = { sendEmail: vi.fn().mockResolvedValue(undefined) };

    const count = await processExpiredEvents(prisma, mailer);

    expect(count).toBe(2);
    expect(prisma.event.update).toHaveBeenCalledTimes(2);
    expect(mailer.sendEmail).toHaveBeenCalledTimes(2);
  });

  it('returns 0 and does nothing when no events are expired', async () => {
    const prisma = makePrisma([]);
    const mailer = { sendEmail: vi.fn() };

    const count = await processExpiredEvents(prisma, mailer);

    expect(count).toBe(0);
    expect(prisma.event.update).not.toHaveBeenCalled();
    expect(mailer.sendEmail).not.toHaveBeenCalled();
  });

  it('includes the admin link in the email body', async () => {
    process.env.APP_BASE_URL = 'https://example.com';
    const prisma = makePrisma([makeEvent()]);
    const mailer = { sendEmail: vi.fn().mockResolvedValue(undefined) };

    await processExpiredEvents(prisma, mailer);

    expect(mailer.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('https://example.com/admin/tok-abc'),
      })
    );
    delete process.env.APP_BASE_URL;
  });

  it('continues processing remaining events when one fails', async () => {

    const events = [makeEvent({ id: 'e-1' }), makeEvent({ id: 'e-2', name: 'Other', organizerEmail: 'b@b.com' })];
    const prisma = {
      event: {
        findMany: vi.fn().mockResolvedValue(events),
        update: vi.fn()
          .mockRejectedValueOnce(new Error('DB failure'))
          .mockResolvedValue({}),
      },
    };
    const mailer = { sendEmail: vi.fn().mockResolvedValue(undefined) };

    const count = await processExpiredEvents(prisma, mailer);

    expect(count).toBe(1);
    expect(mailer.sendEmail).toHaveBeenCalledTimes(1);
    expect(mailer.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'b@b.com' }));
  });
});

describe('purgeOldEvents', () => {
  function makePurge(count = 0) {
    return {
      event: {
        deleteMany: vi.fn().mockResolvedValue({ count }),
      },
    };
  }

  it('deletes locked/finalized events whose deadline is older than the retention period', async () => {
    const prisma = makePurge(3);
    const count = await purgeOldEvents(prisma, 90);
    expect(count).toBe(3);
    expect(prisma.event.deleteMany).toHaveBeenCalledOnce();
    const { where } = prisma.event.deleteMany.mock.calls[0][0];
    expect(where.status.in).toEqual(expect.arrayContaining(['locked', 'finalized']));
    expect(where.deadline.lt).toBeInstanceOf(Date);
  });

  it('sets the cutoff date 90 days in the past by default', async () => {
    const before = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const prisma = makePurge(0);
    await purgeOldEvents(prisma);
    const after = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const cutoff = prisma.event.deleteMany.mock.calls[0][0].where.deadline.lt;
    expect(cutoff.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(cutoff.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('honours a custom retentionDays argument', async () => {
    const prisma = makePurge(0);
    await purgeOldEvents(prisma, 30);
    const cutoff = prisma.event.deleteMany.mock.calls[0][0].where.deadline.lt;
    const expected = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    expect(Math.abs(cutoff.getTime() - expected.getTime())).toBeLessThan(1000);
  });

  it('returns 0 when no events match', async () => {
    const prisma = makePurge(0);
    const count = await purgeOldEvents(prisma, 90);
    expect(count).toBe(0);
  });
});
