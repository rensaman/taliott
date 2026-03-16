#!/usr/bin/env node
/**
 * Inserts/updates a Screenshots section in README.md using images from screenshots/.
 * Run with: node scripts/update-readme-screenshots.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SCREENSHOTS_DIR = path.join(ROOT, 'screenshots');
const README = path.join(ROOT, 'README.md');

const CREATE_SCREENS = [
  { file: 'create-01-landing.png',        label: 'Landing'      },
  { file: 'create-02-event-name.png',     label: 'Event name'   },
  { file: 'create-03-organizer-email.png',label: 'Organizer'    },
  { file: 'create-04-date-and-time.png',  label: 'Date & time'  },
  { file: 'create-05-deadline.png',       label: 'Deadline'     },
  { file: 'create-06-invite-mode.png',    label: 'Invite mode'  },
  { file: 'create-07-review.png',         label: 'Review'       },
  { file: 'create-08-confirmation.png',   label: 'Confirmation' },
];

const PARTICIPATE_SCREENS = [
  { file: 'participate-01-name.png',        label: 'Name'         },
  { file: 'participate-02-location.png',    label: 'Location'     },
  { file: 'participate-03-availability.png',label: 'Availability' },
  { file: 'participate-04-review.png',      label: 'Review'       },
  { file: 'participate-05-done.png',        label: 'Done'         },
];

function screenRow(screens, colsPerRow = 3) {
  const available = screens.filter(s =>
    fs.existsSync(path.join(SCREENSHOTS_DIR, s.file))
  );

  if (available.length === 0) return '_No screenshots yet — run `npm run screenshots` first._\n';

  let rows = '';
  for (let i = 0; i < available.length; i += colsPerRow) {
    const chunk = available.slice(i, i + colsPerRow);
    const imgCells = chunk.map(s =>
      `<td align="center"><img src="screenshots/${s.file}" width="200"/><br/><sub>${s.label}</sub></td>`
    ).join('\n');
    rows += `<tr>\n${imgCells}\n</tr>\n`;
  }
  return `<table>\n${rows}</table>\n`;
}

const section = `## Screenshots

### Creating an event

${screenRow(CREATE_SCREENS)}

### Participating

${screenRow(PARTICIPATE_SCREENS)}
`;

const MARKER_START = '<!-- screenshots:start -->';
const MARKER_END   = '<!-- screenshots:end -->';
const BLOCK = `${MARKER_START}\n${section}${MARKER_END}`;

let readme = fs.readFileSync(README, 'utf8');

if (readme.includes(MARKER_START)) {
  readme = readme.replace(
    new RegExp(`${MARKER_START}[\\s\\S]*?${MARKER_END}`),
    BLOCK
  );
} else {
  readme = readme.trimEnd() + '\n\n' + BLOCK + '\n';
}

fs.writeFileSync(README, readme);
console.log('README.md updated with screenshots section.');
