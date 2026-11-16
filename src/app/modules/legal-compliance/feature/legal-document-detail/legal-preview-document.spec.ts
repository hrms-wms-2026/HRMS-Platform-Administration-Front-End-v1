import { buildLegalPreviewDocument } from './legal-preview-document';

describe('buildLegalPreviewDocument', () => {
  it('wraps the sanitized body in a full page with the console font', () => {
    const page = buildLegalPreviewDocument('<h1>Terms</h1><p>Body</p>', 'light');

    expect(page.startsWith('<!doctype html>')).toBe(true);
    expect(page).toContain('<body><h1>Terms</h1><p>Body</p></body>');
    expect(page).toContain('Roboto');
  });

  it('uses light colours for the light theme', () => {
    const page = buildLegalPreviewDocument('', 'light');

    expect(page).toContain('color-scheme: light');
    expect(page).toContain('background: #ffffff');
  });

  it('uses dark colours for the dark theme', () => {
    const page = buildLegalPreviewDocument('', 'dark');

    expect(page).toContain('color-scheme: dark');
    expect(page).toContain('background: #0f172a');
    expect(page).not.toContain('background: #ffffff');
  });

  it('adds no active content of its own', () => {
    const page = buildLegalPreviewDocument('', 'dark');

    expect(page).not.toMatch(/<script|on[a-z]+=|javascript:/i);
  });
});
