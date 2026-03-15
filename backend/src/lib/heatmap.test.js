import { describe, it, expect, vi } from 'vitest';
import { computeHeatmap } from './heatmap.js';

function makePrisma({ participantCount = 0, slots = [], groupByResult = [] } = {}) {
  return {
    participant: {
      count: vi.fn().mockResolvedValue(participantCount),
    },
    slot: {
      findMany: vi.fn().mockResolvedValue(slots),
    },
    availability: {
      groupBy: vi.fn().mockResolvedValue(groupByResult),
    },
  };
}

describe('computeHeatmap', () => {
  it('returns zero yes_count for all slots when no availability', async () => {
    const prisma = makePrisma({
      participantCount: 2,
      slots: [{ id: 's-1' }, { id: 's-2' }],
      groupByResult: [],
    });
    const result = await computeHeatmap(prisma, 'event-1');
    expect(result.total_participants).toBe(2);
    expect(result.slots).toEqual([
      { slot_id: 's-1', yes_count: 0 },
      { slot_id: 's-2', yes_count: 0 },
    ]);
  });

  it('queries availability with state: "yes" filter', async () => {
    const prisma = makePrisma({
      participantCount: 1,
      slots: [{ id: 's-1' }],
      groupByResult: [],
    });
    await computeHeatmap(prisma, 'event-1');
    expect(prisma.availability.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ state: 'yes' }),
      })
    );
  });

  it('maps yes counts from groupBy result onto the correct slots', async () => {
    const prisma = makePrisma({
      participantCount: 3,
      slots: [{ id: 's-1' }, { id: 's-2' }],
      groupByResult: [
        { slotId: 's-1', _count: { slotId: 2 } },
      ],
    });
    const result = await computeHeatmap(prisma, 'event-1');
    expect(result.total_participants).toBe(3);
    expect(result.slots.find(s => s.slot_id === 's-1').yes_count).toBe(2);
    expect(result.slots.find(s => s.slot_id === 's-2').yes_count).toBe(0);
  });

  it('returns empty slots array when event has no slots', async () => {
    const prisma = makePrisma({ participantCount: 0, slots: [], groupByResult: [] });
    const result = await computeHeatmap(prisma, 'event-1');
    expect(result.total_participants).toBe(0);
    expect(result.slots).toEqual([]);
  });
});
