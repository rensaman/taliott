export default function InviteModeSelector({ value, onChange }) {
  return (
    <fieldset>
      <legend>How will you invite participants?</legend>
      <label>
        <input
          type="radio"
          name="invite_mode"
          value="email_invites"
          checked={value === 'email_invites'}
          onChange={() => onChange('email_invites')}
        />
        Send email invites
      </label>
      <label>
        <input
          type="radio"
          name="invite_mode"
          value="shared_link"
          checked={value === 'shared_link'}
          onChange={() => onChange('shared_link')}
        />
        Share a join link
      </label>
    </fieldset>
  );
}
