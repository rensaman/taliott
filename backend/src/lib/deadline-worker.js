/**
 * Finds events whose deadline has passed with status 'open',
 * transitions them to 'locked', and emails the organizer.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ sendEmail: Function }} mailer
 * @returns {Promise<number>} number of events locked
 */
export async function processExpiredEvents(prisma, mailer) {
  const expired = await prisma.event.findMany({
    where: { status: 'open', deadline: { lt: new Date() } },
  });

  let locked = 0;
  for (const event of expired) {
    try {
      await prisma.event.update({
        where: { id: event.id },
        data: { status: 'locked' },
      });
    } catch (err) {
      console.error('[deadline-worker] Failed to lock event', event.id, ':', err);
      continue;
    }

    locked++;

    const baseUrl = process.env.APP_BASE_URL ?? 'http://localhost:3000';
    const adminLink = `${baseUrl}/admin/${event.adminToken}`;

    try {
      await mailer.sendEmail({
        to: event.organizerEmail,
        subject: `${event.name} — voting has closed`,
        text: `The voting deadline for "${event.name}" has passed. You can now finalize the event here:\n\n${adminLink}`,
      });
    } catch (err) {
      console.error('[deadline-worker] Failed to email organizer for event', event.id, ':', err);
    }
  }

  return locked;
}

/**
 * Deletes locked/finalized events whose deadline is older than retentionDays.
 * Cascade deletes participants, availability, slots, and venues.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {number} retentionDays
 * @returns {Promise<number>} number of events deleted
 */
export async function purgeOldEvents(prisma, retentionDays = 90) {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const { count } = await prisma.event.deleteMany({
    where: {
      status: { in: ['locked', 'finalized'] },
      deadline: { lt: cutoff },
    },
  });
  return count;
}

/**
 * Starts a recurring background job that locks expired events and purges old data.
 *
 * @param {() => import('@prisma/client').PrismaClient} getPrisma
 * @param {{ sendEmail: Function }} mailer
 * @param {number} intervalMs
 * @returns {NodeJS.Timeout}
 */
export function startDeadlineWorker(getPrisma, mailer, intervalMs = 60_000) {
  const run = () => {
    const prisma = getPrisma();
    return Promise.all([
      processExpiredEvents(prisma, mailer),
      purgeOldEvents(prisma).then(n => {
        if (n > 0) console.log(`[deadline-worker] purged ${n} old event(s)`);
      }),
    ]).catch(err => console.error('[deadline-worker]', err));
  };
  run();
  return setInterval(run, intervalMs);
}
