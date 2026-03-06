import { describe, it, expect, vi } from 'vitest';
import { processExpiredEvents } from './deadline-worker.js';

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
  status: 'open',
  ...overrides,
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
