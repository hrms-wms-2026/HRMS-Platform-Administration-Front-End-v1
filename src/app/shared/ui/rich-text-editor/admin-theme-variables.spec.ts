import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// The rich text editor and view are copied from the tenant app and read these theme variables.
// The admin console defines them in styles.css for both themes.
const VARIABLES = [
  '--color-accent',
  '--color-accent-contrast',
  '--color-border',
  '--color-danger',
  '--color-danger-subtle',
  '--color-surface',
  '--color-surface-secondary',
  '--color-text-primary',
  '--color-text-secondary',
  '--shadow-modal',
  '--shadow-popover',
];

function block(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) return '';
  return css.slice(start, css.indexOf('}', start));
}

describe('admin theme variables for the shared rich text editor', () => {
  const css = readFileSync(join(process.cwd(), 'src', 'styles.css'), 'utf8');

  it.each(VARIABLES)('defines %s for the light theme', (name) => {
    expect(block(css, ':root')).toContain(`${name}:`);
  });

  it.each(VARIABLES)('defines %s for the dark theme', (name) => {
    expect(block(css, '.dark')).toContain(`${name}:`);
  });
});
