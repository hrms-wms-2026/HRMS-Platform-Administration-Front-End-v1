// Copied from Hrms--Web-application---front-end---v1 src/app/shared/utils/basic-rich-html.util.spec.ts at da0dc1f7. Change it there first, then copy.
import { BASIC_RICH_HTML_ALLOWED_ATTR, BASIC_RICH_HTML_ALLOWED_TAGS, isRichHtml, sanitizeBasicRichHtml } from './basic-rich-html.util';

describe('basic rich HTML', () => {
  it('uses exactly the shared allowlist (must match the backend BasicRichHtml)', () => {
    expect([...BASIC_RICH_HTML_ALLOWED_TAGS].sort()).toEqual(
      ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li',
        'blockquote', 'a', 'code', 'pre', 'table', 'thead', 'tbody', 'tr', 'th', 'td'].sort()
    );
    expect(BASIC_RICH_HTML_ALLOWED_ATTR).toEqual({ a: ['href', 'title'], td: ['colspan', 'rowspan'], th: ['colspan', 'rowspan'] });
  });

  it('reduces a Word-style paste to allowlisted markup', () => {
    const pasted =
      '<div class="WordSection1"><p class="MsoNormal" style="margin:0"><span style="font-family:Calibri;color:red">Open ' +
      '<b>Settings</b></span></p><font face="Arial">and save</font><img src="x.png"><ul><li style="x">One</li></ul></div>';

    const clean = sanitizeBasicRichHtml(pasted);

    expect(clean).toBe('<p>Open <b>Settings</b></p><p>and save</p><ul><li>One</li></ul>');
  });

  it('removes javascript: and data: links but keeps their text', () => {
    expect(sanitizeBasicRichHtml('<p><a href="javascript:alert(1)">x</a></p>')).toBe('<p><a>x</a></p>');
    expect(sanitizeBasicRichHtml('<a href="data:text/html,x">y</a>')).toBe('<p><a>y</a></p>');
  });

  it('keeps only the attributes allowed for each tag', () => {
    expect(sanitizeBasicRichHtml('<a href="https://x.example" title="X" target="_blank" class="c">x</a>'))
      .toBe('<p><a href="https://x.example" title="X">x</a></p>');
    expect(sanitizeBasicRichHtml('<p title="t">x</p>')).toBe('<p>x</p>');
  });

  // Review finding C1: the editor builds lines out of <div>; they must become paragraphs, not merge.
  it('turns the editor div lines into paragraphs', () => {
    expect(sanitizeBasicRichHtml('a<div>b</div>')).toBe('<p>a</p><p>b</p>');
    expect(sanitizeBasicRichHtml('Para one<div>Para two</div><div><br></div><div>Para three</div>'))
      .toBe('<p>Para one</p><p>Para two</p><p>Para three</p>');
    expect(sanitizeBasicRichHtml('<h1>T</h1><div>Body</div>')).toBe('<h1>T</h1><p>Body</p>');
    expect(sanitizeBasicRichHtml('one<br>two')).toBe('<p>one</p><p>two</p>');
  });

  // Review finding I3: a single typed line must still be rich text, so entities never show literally.
  it('wraps a single line in a paragraph', () => {
    expect(sanitizeBasicRichHtml('Terms &amp; Conditions')).toBe('<p>Terms &amp; Conditions</p>');
  });

  it('keeps line breaks inside list items and quotes', () => {
    expect(sanitizeBasicRichHtml('<ul><li>a<div>b</div></li></ul>')).toBe('<ul><li>a<br>b</li></ul>');
  });

  it('keeps an empty value empty', () => {
    expect(sanitizeBasicRichHtml('<div><br></div>')).toBe('');
  });

  // Same positive href rule as the backend BasicRichHtml.
  it('drops links the backend would reject', () => {
    expect(sanitizeBasicRichHtml('<p><a href="">x</a></p>')).toBe('<p><a>x</a></p>');
    expect(sanitizeBasicRichHtml('<p><a href="https:evil.example">x</a></p>')).toBe('<p><a>x</a></p>');
    expect(sanitizeBasicRichHtml('<p><a href="/\\evil.example">x</a></p>')).toBe('<p><a>x</a></p>');
    expect(sanitizeBasicRichHtml('<p><a href="/help#a">x</a></p>')).toBe('<p><a href="/help#a">x</a></p>');
  });

  it.each([
    ['error at line 5 < 6', false],
    ['a <b and c> d', false],
    ['plain text', false],
    ['<p>x</p>', true],
    ['first</li>', true],
    ['<br/>', true]
  ])('isRichHtml(%j) is %s', (value, expected) => {
    expect(isRichHtml(value)).toBe(expected);
  });
});
