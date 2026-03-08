/**
 * Compute heatmap data: yes_count per slot for all slots in an event.
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} eventId
 * @returns {Promise<{ total_participants: number, slots: { slot_id: string, yes_count: number }[] }>}
 */
export async function computeHeatmap(prisma, eventId) {
  const [totalParticipants, slots, yesCounts] = await Promise.all([
    prisma.participant.count({ where: { eventId } }),
    prisma.slot.findMany({ where: { eventId }, select: { id: true } }),
    prisma.availability.groupBy({
      by: ['slotId'],
      where: { slot: { eventId }, state: 'yes' },
      _count: { slotId: true },
    }),
  ]);

  const yesMap = new Map(yesCounts.map(r => [r.slotId, r._count.slotId]));

  return {
    total_participants: totalParticipants,
    slots: slots.map(s => ({
      slot_id: s.id,
      yes_count: yesMap.get(s.id) ?? 0,
    })),
  };
}
