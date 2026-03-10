/**
 * Shared Playwright helper for navigating the multi-step event creation wizard.
 *
 * Fills each step in sequence and clicks Continue. If `stopAt` is provided,
 * navigation stops after arriving on that step (without advancing past it),
 * so the caller can assert or interact with that step.
 *
 * stopAt values: 'organizer_email' | 'date_range' | 'part_of_day' | 'deadline'
 *                | 'venue_type' | 'invite_mode' | 'participant_emails'
 * Omit stopAt (or pass null) to reach the review step.
 */
export async function fillWizard(page, {
  name = 'Summer meetup',
  organizerEmail = 'alex@example.com',
  dateStart = '2025-06-01',
  dateEnd = '2025-06-03',
  partOfDay = 'all',
  deadline = '2025-05-25T12:00',
  venueType = '',
  inviteMode = 'email_invites',
  participantEmails = '',
  stopAt = null,
} = {}) {
  // Step 1: name → organizer_email
  await page.getByRole('textbox', { name: /event name/i }).fill(name);
  await page.getByRole('button', { name: /continue/i }).click();
  if (stopAt === 'organizer_email') return;

  // Step 2: organizer_email → date_range
  await page.getByRole('textbox', { name: /your email/i }).fill(organizerEmail);
  await page.getByRole('button', { name: /continue/i }).click();
  if (stopAt === 'date_range') return;

  // Step 3: date_range → part_of_day
  await page.getByLabel(/from/i).fill(dateStart);
  await page.getByLabel(/to/i).fill(dateEnd);
  await page.getByRole('button', { name: /continue/i }).click();
  if (stopAt === 'part_of_day') return;

  // Step 4: part_of_day → deadline
  await page.getByRole('radio', { name: partOfDay }).check();
  await page.getByRole('button', { name: /continue/i }).click();
  if (stopAt === 'deadline') return;

  // Step 5: deadline → venue_type
  await page.getByLabel(/voting deadline/i).fill(deadline);
  await page.getByRole('button', { name: /continue/i }).click();
  if (stopAt === 'venue_type') return;

  // Step 6: venue_type → invite_mode
  if (venueType) {
    await page.getByLabel(/venue type/i).fill(venueType);
  }
  await page.getByRole('button', { name: /continue/i }).click();
  if (stopAt === 'invite_mode') return;

  // Step 7: invite_mode → participant_emails or review
  if (inviteMode === 'shared_link') {
    await page.getByRole('radio', { name: /share a join link/i }).check();
  }
  await page.getByRole('button', { name: /continue/i }).click();
  if (stopAt === 'participant_emails') return;

  // Step 8: participant_emails (email_invites only) → review
  if (inviteMode === 'email_invites') {
    if (participantEmails) {
      await page.getByRole('textbox', { name: /participant emails/i }).fill(participantEmails);
    }
    await page.getByRole('button', { name: /continue/i }).click();
  }

  // Caller is now on the review step
}
