import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * The product is Crownus. No old product name (Onevo / Onexso) may remain anywhere a platform
 * admin can see it in this console: templates, code strings, config, styles, asset file names.
 */
const OLD_NAME = /onevo|onexso/i;
// Backend code names (`ONEVO.Api`, ...) are renamed separately.
const ALLOWED = /\bONEVO\.[A-Z][A-Za-z]*/g;
const SOURCE = /\.(ts|html|json|scss|css)$/;

const srcDir = join(__dirname, '..');
const publicDir = join(__dirname, '..', '..', 'public');

function walk(dir: string): string[] {
  try {
    return readdirSync(dir).flatMap((name) => {
      const full = join(dir, name);
      return statSync(full).isDirectory() ? walk(full) : [full];
    });
  } catch {
    return [];
  }
}

describe('visible product name guard', () => {
  it('has no old product name in app sources', () => {
    const findings: string[] = [];

    for (const file of walk(srcDir)) {
      const rel = relative(srcDir, file).replace(/\\/g, '/');
      if (rel.endsWith('.spec.ts')) continue;

      if (OLD_NAME.test(rel)) findings.push(`${rel}: file name`);
      if (!SOURCE.test(rel)) continue;

      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, index) => {
          if (OLD_NAME.test(line.replace(ALLOWED, ''))) findings.push(`${rel}:${index + 1}: ${line.trim().slice(0, 140)}`);
        });
    }

    for (const file of walk(publicDir)) {
      const rel = `public/${relative(publicDir, file).replace(/\\/g, '/')}`;
      if (OLD_NAME.test(rel)) findings.push(`${rel}: file name`);
    }

    expect(findings).toEqual([]);
  });
});
