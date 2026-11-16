// Copied from Hrms--Web-application---front-end---v1 src/app/shared/utils/basic-rich-html.util.spec.ts at 726d4c81. Change it there first, then copy.
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

    expect(clean).toBe('<p>Open <b>Settings</b></p>and save<ul><li>One</li></ul>');
  });

  it('removes javascript: and data: links but keeps their text', () => {
    expect(sanitizeBasicRichHtml('<p><a href="javascript:alert(1)">x</a></p>')).toBe('<p><a>x</a></p>');
    expect(sanitizeBasicRichHtml('<a href="data:text/html,x">y</a>')).toBe('<a>y</a>');
  });

  it('keeps only the attributes allowed for each tag', () => {
    expect(sanitizeBasicRichHtml('<a href="https://x.example" title="X" target="_blank" class="c">x</a>'))
      .toBe('<a href="https://x.example" title="X">x</a>');
    expect(sanitizeBasicRichHtml('<p title="t">x</p>')).toBe('<p>x</p>');
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
