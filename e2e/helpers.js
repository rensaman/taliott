/**
 * Shared Playwright helper for navigating the multi-step event creation wizard.
 *
 * Fills each step in sequence and clicks Continue. If `stopAt` is provided,
 * navigation stops after arriving on that step (without advancing past it),
 * so the caller can assert or interact with that step.
 *
 * stopAt values: 'organizer_email' | 'date_and_time' | 'invite_mode' | 'deadline'
 * Omit stopAt (or pass null) to reach the review step.
 */
export async function fillWizard(page, {
  name = 'Summer meetup',
  organizerEmail = 'alex@example.com',
  isFixed = false,
  fixedDate = '2025-06-01',
  fixedTime = '10:00',
  dateStart = '2025-06-01',
  dateEnd = '2025-06-03',
  timeRangeStart = 480,
  timeRangeEnd = 1320,
  deadline = '2025-05-25T12:00',
  inviteMode = 'shared_link',
  participantEmails = '',
  stopAt = null,
} = {}) {
  // Click through the landing page to reach the event setup form
  await page.getByTestId('create-event-btn').click();

  // Step 1: name → organizer_email
  await page.getByTestId('event-name-input').fill(name);
  await page.getByTestId('wizard-next-btn').click();
  if (stopAt === 'organizer_email') return;

  // Step 2: organizer_email → date_and_time
  await page.getByTestId('organizer-email-input').fill(organizerEmail);
  await page.getByTestId('wizard-next-btn').click();
  if (stopAt === 'date_and_time') return;

  // Step 3: date_and_time → invite_mode
  if (isFixed) {
    await page.getByTestId('toggle-dt-fixed').click();
    await setDateInput(page, 'date-value', fixedDate);
    await page.getByLabel(/start time/i).fill(fixedTime);
  } else {
    await setDateInput(page, 'date-start', dateStart);
    await setDateInput(page, 'date-end', dateEnd);
    await setSlider(page, 'Earliest start', timeRangeStart);
    await setSlider(page, 'Latest start', timeRangeEnd);
  }
  await page.getByTestId('wizard-next-btn').click();
  if (stopAt === 'invite_mode') return;

  // Step 4: invite_mode → deadline
  if (inviteMode === 'email_invites') {
    await page.getByTestId('toggle-invite-email').click();
    if (participantEmails) {
      await page.getByTestId('participant-emails-input').fill(participantEmails);
    }
  }
  // shared_link is the default — no action needed
  await page.getByTestId('wizard-next-btn').click();
  if (stopAt === 'deadline') return;

  // Step 5: deadline → review
  const [dDate, dTime] = deadline.split('T');
  await setDateInput(page, 'date-value', dDate);
  await page.getByLabel(/deadline time/i).fill(dTime);
  await page.getByTestId('wizard-next-btn').click();

  // Caller is now on the review step
}

/**
 * Sets the value of a range slider input using React's synthetic event system.
 * page.fill() doesn't work for range inputs, so we use the native value setter
 * and dispatch a change event that React picks up.
 */
async function setSlider(page, label, value) {
  const slider = page.getByRole('slider', { name: label });
  await slider.evaluate((el, val) => {
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    ).set;
    nativeSetter.call(el, String(val));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

/**
 * Sets a sr-only date input value (used by the calendar date range picker).
 * The inputs are visually hidden so page.fill() won't work; use evaluate instead.
 */
async function setDateInput(page, testId, value) {
  await page.evaluate(({ id, val }) => {
    const el = document.querySelector(`[data-testid="${id}"]`);
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    ).set;
    nativeSetter.call(el, val);
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, { id: testId, val: value });
}
