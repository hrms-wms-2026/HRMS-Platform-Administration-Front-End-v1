// Copied from Hrms--Web-application---front-end---v1 src/app/shared/utils/basic-rich-html.util.ts at 726d4c81. Change it there first, then copy.
import DOMPurify from 'dompurify';

/**
 * The one allowlist for user-authored rich text written with the editor's "basic" toolset (legal
 * documents, support ticket descriptions and comments). It must stay identical to the backend's
 * BasicRichHtml (HRMS-Backend-v1 src/ONEVO.Application/Common/Helpers/BasicRichHtml.cs); a test on
 * each side pins the list.
 */
export const BASIC_RICH_HTML_ALLOWED_TAGS: readonly string[] = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
  'h1', 'h2', 'h3', 'h4',
  'ul', 'ol', 'li',
  'blockquote',
  'a',
  'code', 'pre',
  'table', 'thead', 'tbody', 'tr', 'th', 'td'
];

export const BASIC_RICH_HTML_ALLOWED_ATTR: Readonly<Record<string, readonly string[]>> = {
  a: ['href', 'title'],
  td: ['colspan', 'rowspan'],
  th: ['colspan', 'rowspan']
};

// http(s), mailto, same-origin paths and fragments only: no javascript:, data: or protocol-relative URLs.
const SAFE_URI = /^(?:https?:|mailto:|\/(?!\/)|#)/i;

const purifier = DOMPurify(window);
purifier.addHook('uponSanitizeAttribute', (node, data) => {
  const allowed = BASIC_RICH_HTML_ALLOWED_ATTR[node.nodeName.toLowerCase()] ?? [];
  if (!allowed.includes(data.attrName)) {
    data.keepAttr = false;
  }
});

/** Reduces any HTML (including pasted Word or web content) to the basic allowlist, keeping the text. */
export function sanitizeBasicRichHtml(html: string | null | undefined): string {
  if (!html) return '';
  return purifier.sanitize(html, {
    ALLOWED_TAGS: [...BASIC_RICH_HTML_ALLOWED_TAGS],
    ALLOWED_ATTR: ['href', 'title', 'colspan', 'rowspan'],
    ALLOWED_URI_REGEXP: SAFE_URI,
    KEEP_CONTENT: true
  });
}

// Attributes, when present, must be quoted name="value" pairs, so prose like "a <b and c> d" is not rich text.
const KNOWN_TAG =
  /<\s*\/?\s*(p|br|strong|b|em|i|u|s|h[1-4]|ul|ol|li|blockquote|a|code|pre|table|thead|tbody|tr|th|td)(\s+[a-zA-Z][a-zA-Z0-9-]*\s*=\s*("[^"]*"|'[^']*'))*\s*\/?\s*>/i;

/** True only when the value holds a recognisable allowlisted tag; older plain text stays plain text. */
export function isRichHtml(value: string | null | undefined): boolean {
  return !!value && KNOWN_TAG.test(value);
}
