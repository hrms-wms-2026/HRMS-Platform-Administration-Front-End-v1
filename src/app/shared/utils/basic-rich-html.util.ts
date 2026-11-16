// Copied from Hrms--Web-application---front-end---v1 src/app/shared/utils/basic-rich-html.util.ts at da0dc1f7. Change it there first, then copy.
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

// Same positive rule as the backend BasicRichHtml: http(s)://, mailto:, a same-origin path not followed by
// / or a backslash, or a fragment. Rejects javascript:, data:, protocol-relative and backslash links.
const SAFE_URI = /^(?:https?:\/\/|mailto:|\/(?![/\\])|#)/i;

const purifier = DOMPurify(window);
purifier.addHook('uponSanitizeAttribute', (node, data) => {
  const allowed = BASIC_RICH_HTML_ALLOWED_ATTR[node.nodeName.toLowerCase()] ?? [];
  if (!allowed.includes(data.attrName) || (data.attrName === 'href' && !SAFE_URI.test(data.attrValue.trim()))) {
    data.keepAttr = false;
  }
});

const BLOCK_TAGS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'UL', 'OL', 'BLOCKQUOTE', 'PRE', 'TABLE']);

/** Inside a kept block, nested <div> lines become <br>-separated text instead of merging. */
function unwrapDivs(block: Element): void {
  for (const div of Array.from(block.querySelectorAll('div'))) {
    if (div.previousSibling) div.before(document.createElement('br'));
    div.replaceWith(...Array.from(div.childNodes));
  }
}

/**
 * The editor builds lines out of <div> (and loose text and <br>), which the allowlist does not keep.
 * Turn every line into a <p> (blank lines dropped) so paragraphs survive, and every non-empty value is
 * wrapped in a block, so a single typed line is still rich text.
 */
function normalizeBlocks(html: string): string {
  const template = document.createElement('template');
  template.innerHTML = html;
  const out = document.createElement('div');
  let run: HTMLParagraphElement | null = null;

  const flush = (): void => {
    if (run && (run.textContent ?? '').trim() !== '') out.appendChild(run);
    run = null;
  };
  const walk = (nodes: Node[]): void => {
    for (const node of nodes) {
      if (node instanceof Element) {
        const tag = node.tagName;
        if (tag === 'DIV') {
          flush();
          walk(Array.from(node.childNodes));
          flush();
          continue;
        }
        if (tag === 'BR') {
          flush();
          continue;
        }
        if (BLOCK_TAGS.has(tag)) {
          flush();
          const block = node.cloneNode(true) as Element;
          unwrapDivs(block);
          if ((block.textContent ?? '').trim() !== '') out.appendChild(block);
          continue;
        }
      }
      (run ??= document.createElement('p')).appendChild(node.cloneNode(true));
    }
  };

  walk(Array.from(template.content.childNodes));
  flush();
  return out.innerHTML;
}

/** Reduces any HTML (including pasted Word or web content) to the basic allowlist, keeping the text. */
export function sanitizeBasicRichHtml(html: string | null | undefined): string {
  if (!html) return '';
  return purifier.sanitize(normalizeBlocks(html), {
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
