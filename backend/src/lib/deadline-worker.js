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

  for (const event of expired) {
    await prisma.event.update({
      where: { id: event.id },
      data: { status: 'locked' },
    });

    await mailer.sendEmail({
      to: event.organizerEmail,
      subject: `${event.name} — voting has closed`,
      text: `The voting deadline for "${event.name}" has passed. You can now finalize the event via your admin link.`,
    });
  }

  return expired.length;
}

/**
 * Starts a recurring background job that locks expired events.
 *
 * @param {() => import('@prisma/client').PrismaClient} getPrisma
 * @param {{ sendEmail: Function }} mailer
 * @param {number} intervalMs
 * @returns {NodeJS.Timeout}
 */
export function startDeadlineWorker(getPrisma, mailer, intervalMs = 60_000) {
  const run = () =>
    processExpiredEvents(getPrisma(), mailer).catch(err =>
      console.error('[deadline-worker]', err)
    );
  run();
  return setInterval(run, intervalMs);
}
