import { Theme } from '../../../../core/theme/theme.service';

/**
 * The preview iframe cannot see the console's stylesheet or its light/dark class, so it gets a small
 * fixed stylesheet of its own: the console's font, readable spacing for legal text (headings, lists,
 * tables, links) and the colours of the current theme.
 */
const PALETTES: Record<Theme, { background: string; text: string; muted: string; border: string; link: string }> = {
  light: { background: '#ffffff', text: '#0f172a', muted: '#475569', border: '#e2e8f0', link: '#4f46e5' },
  dark: { background: '#0f172a', text: '#e2e8f0', muted: '#94a3b8', border: '#334155', link: '#a5b4fc' },
};

function stylesheet(theme: Theme): string {
  const c = PALETTES[theme];
  return [
    `:root { color-scheme: ${theme}; }`,
    `html, body { margin: 0; background: ${c.background}; color: ${c.text}; }`,
    'body { padding: 20px 24px; font: 14px/1.65 Roboto, "Segoe UI", system-ui, -apple-system, sans-serif; overflow-wrap: anywhere; }',
    'h1, h2, h3, h4 { line-height: 1.3; margin: 1.4em 0 0.5em; font-weight: 600; }',
    'h1 { font-size: 1.5em; } h2 { font-size: 1.25em; } h3 { font-size: 1.1em; } h4 { font-size: 1em; }',
    'body > :first-child { margin-top: 0; }',
    'p, ul, ol, table, blockquote { margin: 0 0 0.9em; }',
    'ul, ol { padding-left: 1.4em; } li { margin: 0.2em 0; }',
    `a { color: ${c.link}; text-decoration: underline; }`,
    `blockquote { padding-left: 1em; border-left: 3px solid ${c.border}; color: ${c.muted}; }`,
    `hr { border: 0; border-top: 1px solid ${c.border}; margin: 1.5em 0; }`,
    'table { border-collapse: collapse; width: 100%; }',
    `th, td { border: 1px solid ${c.border}; padding: 6px 10px; text-align: left; vertical-align: top; }`,
  ].join('\n');
}

/**
 * Wraps document HTML that has ALREADY been sanitized in a complete page with the preview stylesheet.
 * Never pass unsanitized HTML: the caller trusts the result for the iframe's srcdoc.
 */
export function buildLegalPreviewDocument(sanitizedBodyHtml: string, theme: Theme): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${stylesheet(theme)}</style></head>`
    + `<body>${sanitizedBodyHtml}</body></html>`;
}
