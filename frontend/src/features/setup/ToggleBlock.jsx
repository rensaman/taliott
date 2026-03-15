import React from 'react';
import './ToggleBlock.css';

/**
 * Graphic radio button block.
 * Renders a styled full-width label with a hidden <input type="radio"> inside.
 * The accessible name is derived from title + description text.
 */
export default function ToggleBlock({ name, value, checked, onChange, title, description }) {
  return (
    <label className={`toggle-block${checked ? ' toggle-block--checked' : ''}`}>
      <input
        className="toggle-block-input"
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
      />
      <span className="toggle-block-bar" aria-hidden="true" />
      <span className="toggle-block-body">
        <span className="toggle-block-title">{title}</span>
        {description && (
          <span className="toggle-block-desc">{description}</span>
        )}
      </span>
    </label>
  );
}
