import { describe, it, expect } from 'vitest';
import { computeHeatmap } from './heatmap.js';

function makePrisma({ participants = [], slots = [], availability = [] } = {}) {
  return {
    participant: {
      count: () => Promise.resolve(participants.length),
    },
    slot: {
      findMany: () => Promise.resolve(slots),
    },
    availability: {
      groupBy: () => {
        const counts = {};
        for (const a of availability) {
          if (a.state === 'yes') counts[a.slotId] = (counts[a.slotId] ?? 0) + 1;
        }
        return Promise.resolve(
          Object.entries(counts).map(([slotId, count]) => ({
            slotId,
            _count: { slotId: count },
          }))
        );
      },
    },
  };
}

describe('computeHeatmap', () => {
  it('returns zero yes_count for all slots when no availability', async () => {
    const prisma = makePrisma({
      participants: [{ id: 'p-1' }, { id: 'p-2' }],
      slots: [{ id: 's-1' }, { id: 's-2' }],
      availability: [],
    });
    const result = await computeHeatmap(prisma, 'event-1');
    expect(result.total_participants).toBe(2);
    expect(result.slots).toEqual([
      { slot_id: 's-1', yes_count: 0 },
      { slot_id: 's-2', yes_count: 0 },
    ]);
  });

  it('counts only "yes" states per slot', async () => {
    const prisma = makePrisma({
      participants: [{ id: 'p-1' }, { id: 'p-2' }, { id: 'p-3' }],
      slots: [{ id: 's-1' }, { id: 's-2' }],
      availability: [
        { slotId: 's-1', state: 'yes' },
        { slotId: 's-1', state: 'yes' },
        { slotId: 's-1', state: 'maybe' },
        { slotId: 's-2', state: 'no' },
      ],
    });
    const result = await computeHeatmap(prisma, 'event-1');
    expect(result.total_participants).toBe(3);
    expect(result.slots.find(s => s.slot_id === 's-1').yes_count).toBe(2);
    expect(result.slots.find(s => s.slot_id === 's-2').yes_count).toBe(0);
  });

  it('returns empty slots array when event has no slots', async () => {
    const prisma = makePrisma({ participants: [], slots: [], availability: [] });
    const result = await computeHeatmap(prisma, 'event-1');
    expect(result.total_participants).toBe(0);
    expect(result.slots).toEqual([]);
  });
});
