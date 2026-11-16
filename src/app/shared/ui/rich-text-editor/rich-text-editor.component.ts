// Copied from Hrms--Web-application---front-end---v1 src/app/shared/ui/rich-text-editor/rich-text-editor.component.ts at da0dc1f7. Change it there first, then copy.
import { Component, DestroyRef, ElementRef, computed, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { Observable, Subscription, firstValueFrom } from 'rxjs';
import { ColorSwatchPopoverComponent } from '../color-swatch-popover/color-swatch-popover.component';
import { sanitizeEditableHtml } from '../../utils/editable-html.util';
import { sanitizeBasicRichHtml } from '../../utils/basic-rich-html.util';
import { RICH_TEXT_IMAGE_UPLOADER, RichTextImagePurpose } from './rich-text-image-uploader';
import { StopClickPropagationDirective } from '../../directives/stop-click-propagation.directive';
import { CHAR_COUNTER_THRESHOLD } from '../../constants/text-limits';
import { CharCounterComponent } from '../char-counter/char-counter.component';

export interface SlashCommandItem {
  id: string;
  label: string;
  description: string;
  category: string;
  keywords: string[];
  /** Short glyph for host-supplied commands; built-in commands render their own icons. */
  icon?: string;
}

/** A command the host adds to the "/" menu (e.g. an inbox item's actions). Picking it emits `slashCommand`. */
export interface HostSlashCommand {
  id: string;
  label: string;
  category: string;
  icon?: string;
  description?: string;
}

/** A person who can be @mentioned. */
export interface MentionCandidate {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

interface MentionTriggerContext {
  query: string;
  range: Range;
  textNode: Node;
  atOffset: number;
}

export const ALL_SLASH_COMMANDS: SlashCommandItem[] = [
  { id: 'bold', label: 'Bold', description: 'Make text bold', category: 'SUGGESTIONS', keywords: ['bold', 'strong', 'b'] },
  { id: 'bullet', label: 'Bulleted list', description: 'Create a simple bulleted list', category: 'SUGGESTIONS', keywords: ['bullet', 'list', 'ul', 'unordered'] },
  { id: 'numbered', label: 'Numbered list', description: 'Create a list with numbering', category: 'SUGGESTIONS', keywords: ['numbered', 'order', 'ol', '1'] },
  { id: 'checklist', label: 'To-do / Checklist', description: 'Track tasks with a todo list', category: 'SUGGESTIONS', keywords: ['check', 'todo', 'task', 'checkbox', 'checklist'] },
  { id: 'h1', label: 'Heading 1', description: 'Large section heading', category: 'TEXT', keywords: ['h1', 'heading', 'title', 'large'] },
  { id: 'h2', label: 'Heading 2', description: 'Medium section heading', category: 'TEXT', keywords: ['h2', 'heading', 'subtitle', 'medium'] },
  { id: 'p', label: 'Normal text', description: 'Start writing with plain text', category: 'TEXT', keywords: ['normal', 'paragraph', 'text', 'p'] },
  { id: 'italic', label: 'Italic', description: 'Emphasize your text', category: 'TEXT', keywords: ['italic', 'em', 'i'] },
  { id: 'underline', label: 'Underline', description: 'Underline selected text', category: 'TEXT', keywords: ['underline', 'u'] },
  { id: 'highlight', label: 'Highlight text', description: 'Add yellow highlight color', category: 'TEXT', keywords: ['highlight', 'color', 'background', 'mark'] },
  { id: 'code', label: 'Code', description: 'Format inline snippet or block', category: 'TEXT', keywords: ['code', 'inline', 'snippet'] },
  { id: 'divider', label: 'Divider', description: 'Separate content with a horizontal line', category: 'TEXT', keywords: ['divider', 'hr', 'line', 'separator'] },
  { id: 'image', label: 'Image', description: 'Upload or insert an image', category: 'MEDIA & EMBEDS', keywords: ['image', 'photo', 'picture', 'upload', 'img'] },
  { id: 'link', label: 'Link', description: 'Add an external hyperlink', category: 'MEDIA & EMBEDS', keywords: ['link', 'url', 'href', 'hyperlink'] },
  { id: 'attach', label: 'Attach file', description: 'Upload a file attachment', category: 'MEDIA & EMBEDS', keywords: ['attach', 'file', 'document', 'pdf'] }
];

/** Slash commands whose markup falls outside the basic allowlist. */
const BASIC_HIDDEN_SLASH_COMMANDS = new Set(['checklist', 'highlight', 'divider', 'image', 'attach']);

export interface SlashMenuCoords {
  top?: number | null;
  bottom?: number | null;
  left: number;
  openUpward: boolean;
  maxHeight?: number;
}

/**
 * Shared rich-text editor (toolbar + contenteditable + "/" command palette) used by the task
 * description and by task comments. Content class names (tfm-check-item, tfm-inline-code,
 * tfm-preview-link) are persisted inside saved HTML, so they must not be renamed.
 */
@Component({
  selector: 'app-rich-text-editor',
  standalone: true,
  imports: [StopClickPropagationDirective, ColorSwatchPopoverComponent, CharCounterComponent],
  host: {
    '[class.rte--compact]': 'compact()',
    '[class.rte--borderless]': 'borderless()',
    '[class.rte--readonly]': 'isReadOnlyMode()'
  },
  template: `
              <div class="tfm-editor">
                <div class="tfm-editor__toolbar" appStopClickPropagation>
                  <div class="tfm-editor__tools-left">
                    @if (!isBasic()) {
                    <button
                      type="button"
                      class="tfm-editor__tool tfm-editor__tool--text"
                      [class.tfm-editor__tool--active]="activeFormats().h1"
                      title="Apply Heading 1 to selected text"
                      (mousedown)="$event.preventDefault()"
                      (click)="formatSelectedHeading('h1')"
                    >
                      <span class="tfm-tool-h-label">H1</span>
                    </button>
                    <button
                      type="button"
                      class="tfm-editor__tool tfm-editor__tool--text"
                      [class.tfm-editor__tool--active]="activeFormats().h2"
                      title="Apply Heading 2 to selected text"
                      (mousedown)="$event.preventDefault()"
                      (click)="formatSelectedHeading('h2')"
                    >
                      <span class="tfm-tool-h-label">H2</span>
                    </button>
                    <span class="tfm-editor__divider"></span>
                    }
                    <button
                      type="button"
                      class="tfm-editor__tool"
                      [class.tfm-editor__tool--active]="activeFormats().bold"
                      title="Bold (Ctrl+B) - Click to toggle on/off"
                      (mousedown)="$event.preventDefault()"
                      (click)="formatDoc('bold')"
                    >
                      <strong>B</strong>
                    </button>
                    <button
                      type="button"
                      class="tfm-editor__tool"
                      [class.tfm-editor__tool--active]="activeFormats().italic"
                      title="Italic (Ctrl+I) - Click to toggle on/off"
                      (mousedown)="$event.preventDefault()"
                      (click)="formatDoc('italic')"
                    >
                      <em>I</em>
                    </button>
                    <button
                      type="button"
                      class="tfm-editor__tool"
                      [class.tfm-editor__tool--active]="activeFormats().underline"
                      title="Underline (Ctrl+U) - Click to toggle on/off"
                      (mousedown)="$event.preventDefault()"
                      (click)="formatDoc('underline')"
                    >
                      <u>U</u>
                    </button>
                    @if (!isBasic()) {
                    <div class="tfm-link-anchor">
                      <button
                        type="button"
                        class="tfm-editor__tool"
                        [class.tfm-editor__tool--active]="showTextColorPopover()"
                        title="Text color"
                        (mousedown)="$event.preventDefault()"
                        (click)="toggleTextColorPopover($event)"
                      >
                        <strong style="text-decoration: underline; text-decoration-color: #e03131;">A</strong>
                      </button>
                      @if (showTextColorPopover()) {
                        <app-color-swatch-popover
                          label="Remove color"
                          [swatches]="swatchPalette"
                          (colorSelected)="applyTextColor($event)"
                        />
                      }
                    </div>

                    <div class="tfm-link-anchor">
                      <button
                        type="button"
                        class="tfm-editor__tool"
                        [class.tfm-editor__tool--active]="showHighlightPopover() || activeFormats().highlight"
                        title="Highlight - Click to select color or remove"
                        (mousedown)="$event.preventDefault()"
                        (click)="toggleHighlightPopover($event)"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 11 6-6 4 4-6 6H9v-4Z" /><path d="M3 21h6" /></svg>
                      </button>
                      @if (showHighlightPopover()) {
                        <app-color-swatch-popover
                          label="Remove highlight"
                          [swatches]="highlightPalette"
                          (colorSelected)="applyHighlight($event)"
                        />
                      }
                    </div>
                    }
                    <span class="tfm-editor__divider"></span>
                    <button
                      type="button"
                      class="tfm-editor__tool"
                      [class.tfm-editor__tool--active]="activeFormats().code"
                      title="Code - Click to toggle on/off"
                      (mousedown)="$event.preventDefault()"
                      (click)="toggleCode()"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m16 18 6-6-6-6M8 6l-6 6 6 6" /></svg>
                    </button>
                    <button
                      type="button"
                      class="tfm-editor__tool"
                      [class.tfm-editor__tool--active]="activeFormats().bullet"
                      title="Bullet list - Click to toggle on/off"
                      (mousedown)="$event.preventDefault()"
                      (click)="formatList('unordered')"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
                    </button>
                    <button
                      type="button"
                      class="tfm-editor__tool"
                      [class.tfm-editor__tool--active]="activeFormats().numbered"
                      title="Numbered list - Click to toggle on/off"
                      (mousedown)="$event.preventDefault()"
                      (click)="formatList('ordered')"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M3 18h3L4 15.5a1.5 1.5 0 0 1 2-1.5" /></svg>
                    </button>
                    @if (!isBasic()) {
                    <button
                      type="button"
                      class="tfm-editor__tool"
                      [class.tfm-editor__tool--active]="activeFormats().checklist"
                      title="Checklist - Click to toggle on/off"
                      (mousedown)="$event.preventDefault()"
                      (click)="toggleChecklist()"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="14" height="14" rx="2" /><path d="m7 12 3 3 7-7" /></svg>
                    </button>
                    }
                    <span class="tfm-editor__divider"></span>
                    <div class="tfm-link-anchor">
                      <button
                        type="button"
                        class="tfm-editor__tool"
                        [class.tfm-editor__tool--active]="showLinkPopover() || activeFormats().link"
                        title="Link (Click to add or edit link)"
                        (mousedown)="$event.preventDefault()"
                        (click)="toggleLinkPopover($event)"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                      </button>

                      @if (showLinkPopover()) {
                        <div class="tfm-link-popover" appStopClickPropagation>
                          <div class="tfm-link-popover__row">
                            <input
                              type="text"
                              class="tfm-link-input"
                              placeholder="Paste link (https://...)"
                              [value]="linkUrlInput()"
                              (input)="linkUrlInput.set($any($event.target).value)"
                              (keydown.enter)="applyLink()"
                            />
                          </div>
                          <div class="tfm-link-popover__row">
                            <input
                              type="text"
                              class="tfm-link-input tfm-link-input--secondary"
                              placeholder="Display text (optional)"
                              [value]="linkTextInput()"
                              (input)="linkTextInput.set($any($event.target).value)"
                              (keydown.enter)="applyLink()"
                            />
                          </div>
                          <div class="tfm-link-popover__actions">
                            @if (activeFormats().link) {
                              <button type="button" class="tfm-link-btn tfm-link-btn--remove" (click)="removeLink()">Remove</button>
                            }
                            <button type="button" class="tfm-link-btn tfm-link-btn--cancel" (click)="showLinkPopover.set(false)">Cancel</button>
                            <button type="button" class="tfm-link-btn tfm-link-btn--apply" (click)="applyLink()" [disabled]="!linkUrlInput().trim()">
                              {{ activeFormats().link ? 'Update' : 'Insert link' }}
                            </button>
                          </div>
                        </div>
                      }
                    </div>

                    @if (imagesEnabled()) {
                    <input #imageFileInput type="file" accept="image/png,image/jpeg,image/webp" class="tfm-image-input-hidden" (change)="onImageFileSelected($event)" />
                    <button
                      type="button"
                      class="tfm-editor__tool"
                      title="Insert image"
                      (mousedown)="$event.preventDefault()"
                      (click)="imageFileInput.click()"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
                    </button>
                    }
                  </div>
                </div>

                <input #attachmentFileInput type="file" multiple class="tfm-image-input-hidden" (change)="onAttachmentFileInputChange($event)" />

                <div
                  #contentEditor
                  [attr.contenteditable]="isReadOnlyMode() ? 'false' : 'true'"
                  [attr.tabindex]="isReadOnlyMode() ? 0 : null"
                  [attr.aria-readonly]="isReadOnlyMode()"
                  class="tfm-editor__content"
                  [class.tfm-editor__content--empty]="contentEmpty()"
                  role="textbox"
                  aria-multiline="true"
                  [attr.aria-label]="ariaLabel()"
                  [attr.data-placeholder]="placeholder()"
                  (focus)="onEditorFocus()"
                  (change)="onEditorChange($event)"
                  (keydown)="onEditorSurfaceKeydown($event)"
                  (keyup)="onEditorKeyup()"
                  (mouseup)="onEditorMouseup()"
                  (beforeinput)="onEditorBeforeInput($event)"
                  (input)="onEditorInput()"
                  (blur)="onEditorBlur()"
                  (click)="onEditorSurfaceClick($event)"
                ></div>

                @if (showCounter()) {
                  <app-char-counter class="tfm-editor__counter" [length]="textLength()" [max]="maxLength() ?? 0" />
                }

                @if (showSlashMenu() && filteredSlashCommands().length > 0) {
                  <div
                    #slashMenuRef
                    class="tfm-slash-menu"
                    [class.tfm-slash-menu--upward]="slashMenuCoords()?.openUpward"
                    [style.top]="slashMenuCoords()?.top !== null && slashMenuCoords()?.top !== undefined ? (slashMenuCoords()!.top + 'px') : 'auto'"
                    [style.bottom]="slashMenuCoords()?.bottom !== null && slashMenuCoords()?.bottom !== undefined ? (slashMenuCoords()!.bottom + 'px') : 'auto'"
                    [style.left.px]="slashMenuCoords()?.left ?? 12"
                    [style.max-height.px]="slashMenuCoords()?.maxHeight ?? 310"
                    (mousedown)="$event.preventDefault()"
                  >
                    <div class="tfm-slash-menu__head">
                      <span>{{ filteredSlashCommands()[0]?.category ?? 'SUGGESTIONS' }}</span>
                      <span class="tfm-slash-hint">↑↓ navigate · ↵ select</span>
                    </div>

                    <div class="tfm-slash-menu__list">
                      @for (cmd of filteredSlashCommands(); track cmd.id; let idx = $index) {
                        @if (idx > 0 && cmd.category !== filteredSlashCommands()[idx - 1].category) {
                          <div class="tfm-slash-group-label">{{ cmd.category }}</div>
                        }
                        <button
                          type="button"
                          class="tfm-slash-item"
                          [class.tfm-slash-item--active]="slashSelectedIndex() === idx"
                          [class.tfm-slash-item--current]="isSlashCommandActive(cmd.id)"
                          (mouseenter)="slashSelectedIndex.set(idx)"
                          (click)="executeSlashCommand(cmd.id)"
                        >
                          <div class="tfm-slash-icon">
                            @switch (cmd.id) {
                              @case ('h1') { <strong>H1</strong> }
                              @case ('h2') { <strong>H2</strong> }
                              @case ('p') { <span>T</span> }
                              @case ('bold') { <strong>B</strong> }
                              @case ('italic') { <em>I</em> }
                              @case ('underline') { <u>U</u> }
                              @case ('highlight') {
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 11 6-6 4 4-6 6H9v-4Z" /><path d="M3 21h6" /></svg>
                              }
                              @case ('bullet') {
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
                              }
                              @case ('numbered') {
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M3 18h3L4 15.5a1.5 1.5 0 0 1 2-1.5" /></svg>
                              }
                              @case ('checklist') {
                                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="14" height="14" rx="2" /><path d="m7 12 3 3 7-7" /></svg>
                              }
                              @case ('code') {
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m16 18 6-6-6-6M8 6l-6 6 6 6" /></svg>
                              }
                              @case ('divider') {
                                <svg viewBox="0 0 24 24" aria-hidden="true"><line x1="3" y1="12" x2="21" y2="12" stroke-width="2" /></svg>
                              }
                              @case ('image') {
                                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
                              }
                              @case ('link') {
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                              }
                              @case ('attach') {
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
                              }
                              @default { <span aria-hidden="true">{{ cmd.icon ?? '/' }}</span> }
                            }
                          </div>
                          <div class="tfm-slash-text">
                            <div class="tfm-slash-name-row">
                              <span class="tfm-slash-name">{{ cmd.label }}</span>
                              @if (isSlashCommandActive(cmd.id)) {
                                <span class="tfm-slash-active-badge">Active</span>
                              }
                            </div>
                            <span class="tfm-slash-desc">{{ cmd.description }}</span>
                          </div>
                          @if (isSlashCommandActive(cmd.id)) {
                            <div class="tfm-slash-check-icon" title="Active format">
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </div>
                          }
                        </button>
                      }
                    </div>
                  </div>
                } @else if (showSlashMenu() && filteredSlashCommands().length === 0) {
                  <div
                    class="tfm-slash-menu tfm-slash-menu--empty"
                    [class.tfm-slash-menu--upward]="slashMenuCoords()?.openUpward"
                    [style.top]="slashMenuCoords()?.top !== null && slashMenuCoords()?.top !== undefined ? (slashMenuCoords()!.top + 'px') : 'auto'"
                    [style.bottom]="slashMenuCoords()?.bottom !== null && slashMenuCoords()?.bottom !== undefined ? (slashMenuCoords()!.bottom + 'px') : 'auto'"
                    [style.left.px]="slashMenuCoords()?.left ?? 12"
                    [style.max-height.px]="slashMenuCoords()?.maxHeight ?? 310"
                    (mousedown)="$event.preventDefault()"
                  >
                    <span class="tfm-slash-empty-text">No matching commands</span>
                  </div>
                }

                @if (showMentionMenu()) {
                  <div
                    class="tfm-slash-menu tfm-mention-menu"
                    role="listbox"
                    aria-label="Mention someone"
                    [class.tfm-slash-menu--upward]="mentionMenuCoords()?.openUpward"
                    [style.top]="mentionMenuCoords()?.top !== null && mentionMenuCoords()?.top !== undefined ? (mentionMenuCoords()!.top + 'px') : 'auto'"
                    [style.bottom]="mentionMenuCoords()?.bottom !== null && mentionMenuCoords()?.bottom !== undefined ? (mentionMenuCoords()!.bottom + 'px') : 'auto'"
                    [style.left.px]="mentionMenuCoords()?.left ?? 12"
                    [style.max-height.px]="mentionMenuCoords()?.maxHeight ?? 310"
                    (mousedown)="$event.preventDefault()"
                  >
                    @if (mentionMenuItems().length === 0) {
                      <span class="tfm-slash-empty-text">No matching people</span>
                    }
                    <div class="tfm-slash-menu__list">
                      @for (item of mentionMenuItems(); track item.person.id + item.addAndTag; let idx = $index) {
                        @if (idx === 0 && !item.addAndTag) {
                          <div class="tfm-slash-group-label">In this conversation</div>
                        }
                        @if (item.addAndTag && (idx === 0 || !mentionMenuItems()[idx - 1].addAndTag)) {
                          <div class="tfm-slash-group-label">Add and tag</div>
                        }
                        <button
                          type="button"
                          role="option"
                          class="tfm-slash-item"
                          [attr.aria-selected]="mentionSelectedIndex() === idx"
                          [class.tfm-slash-item--active]="mentionSelectedIndex() === idx"
                          (mouseenter)="mentionSelectedIndex.set(idx)"
                          (click)="item.addAndTag ? pickAddAndTag(item.person) : pickMention(item.person)"
                        >
                          <div class="tfm-slash-icon tfm-mention-avatar">
                            @if (item.person.avatarUrl) {
                              <img [src]="item.person.avatarUrl" alt="" />
                            } @else {
                              <span aria-hidden="true">{{ item.person.name.charAt(0).toUpperCase() }}</span>
                            }
                          </div>
                          <div class="tfm-slash-text">
                            <span class="tfm-slash-name">{{ item.person.name }}</span>
                            @if (item.addAndTag) {
                              <span class="tfm-slash-desc">Adds them to the conversation</span>
                            }
                          </div>
                        </button>
                      }
                    </div>
                  </div>
                }
              </div>
  `,
  styles: [`
    .tfm-editor__counter { padding: 0 10px 6px; }
    .tfm-editor { position: relative; display: flex; flex-direction: column; border: 1px solid var(--color-border); border-radius: 9px; overflow: visible; background: var(--color-surface); min-height: 140px; transition: border-color 150ms ease, box-shadow 150ms ease; }
    .tfm-editor:focus-within { border-color: var(--color-accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent) 25%, transparent); }
    .tfm-editor__toolbar { border-top-left-radius: 8px; border-top-right-radius: 8px; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 10px; background: var(--color-surface-secondary); border-bottom: 1px solid var(--color-border); user-select: none; }
    .tfm-editor__tool { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border: 0; border-radius: 5px; background: transparent; color: var(--color-text-secondary); font-size: 13px; cursor: pointer; transition: background-color 120ms ease, color 120ms ease; }
    .tfm-editor__tool:hover { background: var(--color-surface); color: var(--color-text-primary); }
    .tfm-editor__tool--active { background: color-mix(in srgb, var(--color-accent) 18%, var(--color-surface)) !important; color: var(--color-accent) !important; font-weight: 700; }
    .tfm-tool-h-label { font-size: 11.5px; font-weight: 700; letter-spacing: -0.01em; line-height: 1; }
    .tfm-editor__tool svg { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .tfm-link-anchor { position: relative; display: inline-flex; }
    .tfm-image-input-hidden { display: none; }
    .tfm-link-popover { position: absolute; top: calc(100% + 6px); left: 0; z-index: 1050; width: 250px; padding: 10px; border-radius: 8px; border: 1px solid var(--color-border); background: var(--color-surface); box-shadow: var(--shadow-popover); display: flex; flex-direction: column; gap: 8px; animation: tfm-popover-in 120ms ease-out; }
    .tfm-link-popover__row { display: flex; width: 100%; }
    .tfm-link-input { width: 100%; height: 30px; padding: 0 8px; border: 1px solid var(--color-border); border-radius: 5px; background: var(--color-surface-secondary); font: inherit; font-size: 12px; color: var(--color-text-primary); outline: none; }
    .tfm-link-input:focus { border-color: var(--color-accent); background: var(--color-surface); }
    .tfm-link-input--secondary { font-size: 11.5px; opacity: 0.85; }
    .tfm-link-popover__actions { display: flex; align-items: center; justify-content: flex-end; gap: 6px; }
    .tfm-link-btn { border: 0; padding: 4px 10px; border-radius: 5px; font-size: 11.5px; font-weight: 600; cursor: pointer; transition: all 120ms ease; }
    .tfm-link-btn--cancel { background: transparent; color: var(--color-text-secondary); }
    .tfm-link-btn--cancel:hover { background: var(--color-surface-secondary); color: var(--color-text-primary); }
    .tfm-link-btn--remove { background: transparent; color: var(--color-danger); margin-right: auto; padding-left: 2px; }
    .tfm-link-btn--remove:hover { background: var(--color-danger-subtle); }
    .tfm-link-btn--apply { background: var(--color-accent); color: var(--color-accent-contrast); }
    .tfm-link-btn--apply:hover { opacity: 0.9; }
    .tfm-link-btn--apply:disabled { opacity: 0.4; cursor: not-allowed; }
    .tfm-editor__divider { width: 1px; height: 16px; background: var(--color-border); margin: 0 4px; }
    .tfm-editor__content { width: 100%; min-height: 96px; padding: 12px 14px; outline: none; font: inherit; font-size: 14px; line-height: 1.6; color: var(--color-text-primary); overflow-y: auto; word-break: break-word; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; }
    .tfm-editor__content--empty::before { content: attr(data-placeholder); color: var(--color-text-secondary); opacity: 0.65; pointer-events: none; }
    /*
     * The rules below style content that lands inside .tfm-editor__content and .tfm-editor__preview
     * via raw DOM APIs (execCommand/insertNode) or [innerHTML] - never through Angular's template
     * compiler. Angular's emulated view encapsulation stamps a scoping attribute only on elements it
     * renders itself, so a plain scoped selector like ".tfm-editor__content ul" silently never matches
     * these nodes. ::ng-deep drops that attribute requirement for the unscoped part of the selector.
     */
    .tfm-editor__content ::ng-deep h1 { display: block; font-size: 22px !important; font-weight: 750 !important; line-height: 1.3 !important; margin: 16px 0 6px !important; color: var(--color-text-primary); }
    .tfm-editor__content ::ng-deep h2 { display: block; font-size: 18px !important; font-weight: 700 !important; line-height: 1.35 !important; margin: 12px 0 4px !important; color: var(--color-text-primary); }
    .tfm-editor__content ::ng-deep .tfm-inline-h1 { font-size: 22px !important; font-weight: inherit; line-height: 1.3; }
    .tfm-editor__content ::ng-deep .tfm-inline-h2 { font-size: 18px !important; font-weight: inherit; line-height: 1.35; }
    .tfm-editor__content ::ng-deep h3 { display: block; font-size: 15px !important; font-weight: 650 !important; line-height: 1.4 !important; margin: 10px 0 4px !important; color: var(--color-text-primary); }
    .tfm-editor__content ::ng-deep p, .tfm-editor__content ::ng-deep div { font-size: 14px; line-height: 1.6; }
    .tfm-editor__content ::ng-deep strong, .tfm-editor__content ::ng-deep b { font-weight: 700 !important; font-size: inherit; }
    .tfm-editor__content ::ng-deep em, .tfm-editor__content ::ng-deep i { font-style: italic; }
    .tfm-editor__content ::ng-deep .mention { display: inline; padding: 0 3px; border-radius: 4px; background: color-mix(in srgb, var(--color-accent) 12%, transparent); color: var(--color-accent); font-weight: 600; white-space: nowrap; }
    .tfm-mention-avatar { border-radius: 50%; overflow: hidden; }
    .tfm-mention-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .tfm-editor__content ::ng-deep u { text-decoration: underline; }
    .tfm-editor__content ::ng-deep h3, ::ng-deep .tfm-preview-h2 { margin: 8px 0 4px; font-size: 15px; font-weight: 700; color: var(--color-text-primary); }
    .tfm-editor__content ::ng-deep hr, ::ng-deep .tfm-preview-hr { border: 0; height: 1px; background: var(--color-border); margin: 12px 0; }
    .tfm-editor__content ::ng-deep ul { margin: 6px 0; padding-left: 20px; list-style-type: disc; }
    .tfm-editor__content ::ng-deep ol { margin: 6px 0; padding-left: 20px; list-style-type: decimal; }
    .tfm-editor__content ::ng-deep li { margin-bottom: 2px; }
    .tfm-editor__content ::ng-deep code, ::ng-deep .tfm-inline-code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12.5px; background: var(--color-surface-secondary); border: 1px solid var(--color-border); padding: 1px 5px; border-radius: 4px; color: var(--color-accent); }
    .tfm-editor__content ::ng-deep pre { margin: 6px 0; padding: 8px 12px; border-radius: 6px; background: var(--color-surface-secondary); border: 1px solid var(--color-border); font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12.5px; overflow-x: auto; }
    .tfm-editor__content ::ng-deep .tfm-check-item,
    .tfm-editor__content ::ng-deep .tfm-editor-check-item {
      position: relative;
      display: block !important;
      padding-left: 26px;
      min-height: 24px;
      line-height: 1.6;
      margin: 3px 0;
      color: var(--color-text-primary);
    }
    .tfm-editor__content ::ng-deep .tfm-check-item > input[type="checkbox"],
    .tfm-editor__content ::ng-deep .tfm-editor-check-item > input[type="checkbox"] {
      position: absolute;
      left: 2px;
      top: 4px;
      width: 15px;
      height: 15px;
      accent-color: var(--color-accent);
      cursor: pointer;
      user-select: none;
      margin: 0;
    }
    .tfm-editor__content ::ng-deep .tfm-check-item > .tfm-check-text,
    .tfm-editor__content ::ng-deep .tfm-editor-check-item > .tfm-check-text {
      display: inline;
      font: inherit;
      color: inherit;
    }
    .tfm-editor__content ::ng-deep .tfm-check-item.is-checked > .tfm-check-text,
    .tfm-editor__content ::ng-deep .tfm-editor-check-item.is-checked > .tfm-check-text,
    .tfm-editor__content ::ng-deep .tfm-check-item:has(> input[type="checkbox"]:checked) > .tfm-check-text,
    .tfm-editor__content ::ng-deep .tfm-editor-check-item:has(> input[type="checkbox"]:checked) > .tfm-check-text {
      text-decoration: line-through;
      opacity: 0.6;
    }
    ::ng-deep .tfm-preview-link { color: var(--color-accent); text-decoration: underline; cursor: pointer; }

    /* Slash Command Palette */
    .tfm-slash-menu { position: absolute; z-index: 1100; width: 300px; max-height: 310px; overflow-y: auto; border-radius: 8px; border: 1px solid var(--color-border); background: var(--color-surface); box-shadow: var(--shadow-modal); animation: tfm-popover-in 120ms ease-out; display: flex; flex-direction: column; padding: 4px; transform-origin: top left; }
    .tfm-slash-menu--upward { animation: tfm-popover-in-up 120ms ease-out; transform-origin: bottom left; }
    .tfm-slash-menu--empty { padding: 14px; text-align: center; }
    .tfm-slash-empty-text { font-size: 12px; color: var(--color-text-secondary); font-style: italic; }
    .tfm-slash-menu__head { display: flex; align-items: center; justify-content: space-between; padding: 6px 8px 4px; font-size: 10.5px; font-weight: 700; color: var(--color-text-secondary); letter-spacing: .06em; text-transform: uppercase; border-bottom: 1px solid var(--color-border); margin-bottom: 4px; }
    .tfm-slash-hint { font-size: 10px; font-weight: 500; text-transform: none; opacity: 0.8; }
    .tfm-slash-menu__list { display: flex; flex-direction: column; gap: 1px; }
    .tfm-slash-group-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-secondary); padding: 8px 8px 3px; }
    .tfm-slash-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 6px 8px; border: 0; border-radius: 6px; background: transparent; color: var(--color-text-primary); font: inherit; cursor: pointer; text-align: left; transition: background-color 100ms ease; }
    .tfm-slash-item:hover, .tfm-slash-item--active { background: color-mix(in srgb, var(--color-accent) 10%, var(--color-surface)); color: var(--color-accent); }
    .tfm-slash-icon { width: 26px; height: 26px; border-radius: 5px; background: var(--color-surface-secondary); display: inline-flex; align-items: center; justify-content: center; font-size: 11.5px; font-weight: 700; color: var(--color-text-primary); flex-shrink: 0; }
    .tfm-slash-item:hover .tfm-slash-icon, .tfm-slash-item--active .tfm-slash-icon { background: var(--color-surface); color: var(--color-accent); }
    .tfm-slash-icon svg { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .tfm-slash-text { display: flex; flex-direction: column; min-width: 0; flex: 1; }
    .tfm-slash-name-row { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
    .tfm-slash-name { font-size: 13px; font-weight: 600; color: inherit; line-height: 1.25; }
    .tfm-slash-active-badge { display: inline-flex; align-items: center; padding: 1px 5px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; border-radius: 4px; background: color-mix(in srgb, var(--color-accent) 14%, transparent); color: var(--color-accent); flex-shrink: 0; }
    .tfm-slash-check-icon { display: flex; align-items: center; justify-content: center; width: 18px; height: 18px; margin-left: auto; color: var(--color-accent); flex-shrink: 0; }
    .tfm-slash-check-icon svg { width: 14px; height: 14px; stroke: currentColor; stroke-width: 2.5; fill: none; }
    .tfm-slash-item--current { background: color-mix(in srgb, var(--color-accent) 5%, transparent); }
    .tfm-slash-item--current .tfm-slash-icon { background: color-mix(in srgb, var(--color-accent) 15%, var(--color-surface)); color: var(--color-accent); }
    .tfm-slash-desc { font-size: 11px; color: var(--color-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    @keyframes tfm-popover-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes tfm-popover-in-up { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

    :host { display: block; }
    :host(.rte--compact) .tfm-editor { min-height: 0; }
    :host(.rte--compact) .tfm-editor__content { min-height: 64px; padding: 8px 12px; font-size: 13.5px; }
    :host(.rte--borderless) .tfm-editor,
    :host(.rte--borderless) .tfm-editor:focus-within { min-height: 0; border: 0; border-bottom: 1px solid var(--color-border); border-radius: 0; background: transparent; box-shadow: none; }
    :host(.rte--borderless) .tfm-editor__toolbar { padding: 4px 8px; border: 0; border-radius: 0; background: transparent; }
    :host(.rte--borderless) .tfm-editor__content { min-height: 88px; padding: 10px 8px 14px; border-radius: 0; }
    :host(.rte--readonly) .tfm-editor { transition: background-color 140ms ease, border-radius 140ms ease; }
    :host(.rte--readonly) .tfm-editor:hover { border-radius: 6px; background: var(--color-surface-secondary); }
    :host(.rte--readonly) .tfm-editor__toolbar { display: none; }
    :host(.rte--readonly) .tfm-editor__content { cursor: text; }
    :host(.rte--readonly) .tfm-editor__content:focus { outline: none; }
    :host(.rte--readonly) .tfm-editor__content ::ng-deep input[type="checkbox"] { pointer-events: none; }
    :host(.rte--borderless.rte--compact) .tfm-editor__content { min-height: 64px; padding: 8px 8px 12px; }
  `]
})
export class RichTextEditorComponent {
  private readonly imageUploader = inject(RICH_TEXT_IMAGE_UPLOADER, { optional: true });
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Seeds the editor whenever it is empty and this value is non-empty (e.g. after async load). */
  initialHtml = input<string>('');
  placeholder = input<string>("Write description or press '/' for commands...");
  ariaLabel = input<string>('Description');
  imageUploadPurpose = input<RichTextImagePurpose>('task_description_image');
  /**
   * 'basic' (legal documents, support tickets) offers only what the shared HTML allowlist keeps: no
   * colours, highlights, checklists, dividers, images, attachments or mentions, and every emitted
   * value is reduced to that allowlist. 'full' is the task/meeting editor, unchanged.
   */
  toolset = input<'full' | 'basic'>('full');
  readonly isBasic = computed(() => this.toolset() === 'basic');
  /** Images need an uploader from the host app and are never offered by the basic toolset. */
  readonly imagesEnabled = computed(() => this.allowImages() && !this.isBasic() && this.imageUploader !== null);
  allowAttachments = input<boolean>(true);
  /** Off where uploaded inline images can't be linked to an owner (e.g. checklist templates). */
  allowImages = input<boolean>(true);
  compact = input<boolean>(false);
  /** Removes the editor chrome while preserving the toolbar and editable content. */
  borderless = input<boolean>(true);
  /** Permanently displays formatted content without allowing activation. */
  readOnly = input<boolean>(false);
  /** Starts as formatted content and reveals editing controls only after interaction. */
  activateOnClick = input<boolean>(true);
  /**
   * Limit on the visible text (not the HTML). Typing and pasting stop at it, and a counter
   * appears from 80% of it. null (default) means no limit.
   */
  maxLength = input<number | null>(null);
  editorActive = signal(false);
  contentEmpty = signal(true);
  /** Visible characters in the editor. */
  readonly textLength = signal(0);
  readonly showCounter = computed(() => {
    const max = this.maxLength();
    return !!max && !this.isReadOnlyMode() && this.textLength() >= Math.ceil(max * CHAR_COUNTER_THRESHOLD);
  });
  /** True when the text is longer than maxLength (e.g. loaded that way, or typed via an IME). */
  readonly overLimit = computed(() => {
    const max = this.maxLength();
    return !!max && this.textLength() > max;
  });
  isReadOnlyMode = computed(() => this.readOnly() || (this.activateOnClick() && !this.editorActive()));
  private editHistory: string[] = [''];
  private historyIndex = 0;
  private restoringHistory = false;
  /**
   * When false, text color is written as <font color> instead of an inline style. Needed where the
   * saved HTML is later rendered through Angular's [innerHTML] sanitizer, which strips style attrs.
   */
  cssStyles = input<boolean>(true);

  /** Emits the editor HTML on every change; '' when the editor is visually empty. */
  htmlChange = output<string>();
  /** Emits files picked via the "/attach" command - the host decides how to upload them. */
  filesAttached = output<File[]>();
  uploadFailed = output<string>();

  /** Extra "/" commands supplied by the host; listed before the formatting commands. */
  extraSlashCommands = input<readonly HostSlashCommand[]>([]);
  /** Emits the id of a host slash command the user picked. */
  slashCommand = output<string>();

  /** People who can be @mentioned. null (default) turns @mentions off. */
  mentionCandidates = input<readonly MentionCandidate[] | null>(null);
  /** Also offer people outside mentionCandidates (found via mentionSearch) as "add and tag". */
  allowAddAndTag = input<boolean>(false);
  mentionSearch = input<((query: string) => Observable<readonly MentionCandidate[]>) | null>(null);
  /** Emits the distinct employee ids mentioned in the content whenever that set changes. */
  mentionsChange = output<string[]>();
  /** Emits a non-candidate the user chose to add and tag; the host adds them, then calls insertMention. */
  addAndTag = output<MentionCandidate>();

  /** Chat-style input: Enter asks the host to submit (Shift+Enter still adds a line). */
  submitOnEnter = input<boolean>(false);
  submitRequested = output<void>();

  readonly contentEditor = viewChild<ElementRef<HTMLDivElement>>('contentEditor');
  readonly imageFileInput = viewChild<ElementRef<HTMLInputElement>>('imageFileInput');
  readonly attachmentFileInput = viewChild<ElementRef<HTMLInputElement>>('attachmentFileInput');

  showLinkPopover = signal(false);
  linkUrlInput = signal('');
  linkTextInput = signal('');
  savedLinkRange: Range | null = null;

  showTextColorPopover = signal(false);
  showHighlightPopover = signal(false);
  private savedColorRange: Range | null = null;

  readonly swatchPalette = [
    { name: 'Red', hex: '#e03131' }, { name: 'Orange', hex: '#f08c00' },
    { name: 'Yellow', hex: '#f2c400' }, { name: 'Green', hex: '#2f9e44' },
    { name: 'Blue', hex: '#1971c2' }, { name: 'Purple', hex: '#9c36b5' },
    { name: 'Pink', hex: '#e64980' }, { name: 'Default', hex: '#1e293b' }
  ];

  readonly highlightPalette = [
    { name: 'Red', hex: '#ffc9c9' }, { name: 'Orange', hex: '#ffe0b2' },
    { name: 'Yellow', hex: '#fff3bf' }, { name: 'Green', hex: '#d3f9d8' },
    { name: 'Blue', hex: '#d0ebff' }, { name: 'Purple', hex: '#eebefa' },
    { name: 'Pink', hex: '#ffd6e8' }, { name: 'Grey', hex: '#e9ecef' }
  ];

  private readonly hostSlashCommandIds = computed(() => new Set(this.extraSlashCommands().map((cmd) => cmd.id)));
  readonly allSlashCommands = computed<SlashCommandItem[]>(() => {
    const host = this.extraSlashCommands().map((cmd) => ({
      id: cmd.id,
      label: cmd.label,
      description: cmd.description ?? '',
      category: cmd.category,
      keywords: [cmd.id],
      icon: cmd.icon
    }));
    const builtIn = ALL_SLASH_COMMANDS.filter(
      (cmd) =>
        ((this.allowAttachments() && !this.isBasic()) || cmd.id !== 'attach') &&
        (this.imagesEnabled() || cmd.id !== 'image') &&
        !(this.isBasic() && BASIC_HIDDEN_SLASH_COMMANDS.has(cmd.id))
    );
    return [...host, ...builtIn];
  });
  showSlashMenu = signal(false);
  slashQuery = signal('');
  slashSelectedIndex = signal(0);
  slashMenuCoords = signal<SlashMenuCoords | null>(null);

  showMentionMenu = signal(false);
  mentionQuery = signal('');
  mentionSelectedIndex = signal(0);
  mentionMenuCoords = signal<SlashMenuCoords | null>(null);
  addAndTagResults = signal<readonly MentionCandidate[]>([]);
  readonly filteredMentionCandidates = computed(() => {
    const q = this.mentionQuery().toLowerCase();
    return (this.mentionCandidates() ?? []).filter((p) => p.name.toLowerCase().includes(q));
  });
  /** Participants first, then "add and tag" search results: the order keyboard navigation follows. */
  readonly mentionMenuItems = computed(() => [
    ...this.filteredMentionCandidates().map((person) => ({ person, addAndTag: false })),
    ...this.addAndTagResults().map((person) => ({ person, addAndTag: true }))
  ]);
  private pendingMention: MentionTriggerContext | null = null;
  private mentionSearchSub: Subscription | null = null;
  private lastMentionIds: string[] = [];

  activeFormats = signal<{
    bold: boolean;
    italic: boolean;
    underline: boolean;
    h1: boolean;
    h2: boolean;
    code: boolean;
    bullet: boolean;
    numbered: boolean;
    checklist: boolean;
    highlight: boolean;
    link: boolean;
  }>({
    bold: false,
    italic: false,
    underline: false,
    h1: false,
    h2: false,
    code: false,
    bullet: false,
    numbered: false,
    checklist: false,
    highlight: false,
    link: false
  });

  filteredSlashCommands = computed(() => {
    const q = this.slashQuery().toLowerCase().trim();
    const all = this.allSlashCommands();
    if (!q) return all;
    return all.filter((cmd) =>
      cmd.label.toLowerCase().includes(q) ||
      cmd.description.toLowerCase().includes(q) ||
      cmd.keywords.some((k) => k.toLowerCase().includes(q))
    );
  });

  constructor() {
    effect(() => {
      const html = this.initialHtml();
      const el = this.contentEditor()?.nativeElement;
      if (el && !el.innerHTML && html) {
        // Stored HTML can come from another user; innerHTML skips Angular's sanitizer.
        el.innerHTML = sanitizeEditableHtml(html);
        this.normalizeBlockLines(el);
        const empty = this.isElementVisuallyEmpty(el);
        untracked(() => {
          this.contentEmpty.set(empty);
          this.textLength.set(this.visibleTextLength(el));
          this.resetHistory(empty ? '' : el.innerHTML);
          this.emitHtml(empty ? '' : el.innerHTML);
        });
      }
    });

    // Close the editor's own popovers on any press outside it. Capture phase, because hosts like
    // the task modal stop click propagation on their dialog container.
    const onOutsidePress = (event: MouseEvent) => {
      if (!this.host.nativeElement.contains(event.target as Node)) this.closePopovers();
    };
    document.addEventListener('mousedown', onOutsidePress, true);

    // Reposition or dismiss slash menu on scroll in ancestors or the editor
    const onScroll = (event: Event) => {
      if (!this.showSlashMenu()) return;
      const target = event.target as HTMLElement | null;
      if (target && target.closest && target.closest('.tfm-slash-menu')) {
        return;
      }
      const ctx = this.getSlashTriggerContext();
      if (ctx) {
        this.updateSlashMenuPosition(ctx.range);
      } else {
        this.closeSlashMenu();
      }
    };
    window.addEventListener('scroll', onScroll, true);

    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => {
      document.removeEventListener('mousedown', onOutsidePress, true);
      window.removeEventListener('scroll', onScroll, true);
      this.mentionSearchSub?.unsubscribe();
    });
  }

  /** Replaces the editor content (used when the host loads/switches the record being edited). */
  setHtml(html: string): void {
    const el = this.contentEditor()?.nativeElement;
    if (!el) return;
    el.innerHTML = sanitizeEditableHtml(html);
    if (html) this.normalizeBlockLines(el);
    const empty = this.isElementVisuallyEmpty(el);
    this.contentEmpty.set(empty);
    this.textLength.set(this.visibleTextLength(el));
    this.resetHistory(empty ? '' : el.innerHTML);
    this.emitHtml(empty ? '' : el.innerHTML);
  }

  clear(): void {
    const el = this.contentEditor()?.nativeElement;
    if (el) el.innerHTML = '';
    this.contentEmpty.set(true);
    this.textLength.set(0);
    this.resetHistory('');
    this.closePopovers();
    this.linkUrlInput.set('');
    this.linkTextInput.set('');
    this.savedLinkRange = null;
    this.editorActive.set(false);
  }

  /** Focuses the editor and places the caret at the end of its content. */
  focus(): void {
    if (this.readOnly()) return;
    if (this.activateOnClick() && !this.editorActive()) {
      this.editorActive.set(true);
      setTimeout(() => this.focus());
      return;
    }
    const el = this.contentEditor()?.nativeElement;
    if (!el) return;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }

  /** Inserts plain text (e.g. an emoji) at the caret, or at the end when the caret is not in the editor. */
  insertText(text: string): void {
    if (this.readOnly() || !text) return;
    if (this.activateOnClick() && !this.editorActive()) {
      this.editorActive.set(true);
      setTimeout(() => this.insertText(text));
      return;
    }
    const el = this.contentEditor()?.nativeElement;
    if (!el) return;
    const sel = window.getSelection();
    let range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
    if (!range || !el.contains(range.commonAncestorContainer)) {
      range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
    }
    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    sel?.removeAllRanges();
    sel?.addRange(range);
    el.focus();
    this.onEditorInput();
  }

  closePopovers(): void {
    this.showLinkPopover.set(false);
    this.showTextColorPopover.set(false);
    this.showHighlightPopover.set(false);
    this.closeSlashMenu();
    this.closeMentionMenu();
  }

  onAttachmentFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.filesAttached.emit(Array.from(input.files));
    }
    input.value = '';
  }

  formatDoc(command: string, value: string | undefined = undefined): void {
    const el = this.contentEditor()?.nativeElement;
    if (!el) return;
    el.focus();
    document.execCommand(command, false, value);
    this.onEditorInput();
    this.updateActiveFormats();
  }

  private getEditorAnchorNode(el: HTMLElement, sel: Selection | null): Node | null {
    if (!sel || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);

    if (sel.anchorNode && el.contains(sel.anchorNode) && sel.anchorNode !== el) {
      return sel.anchorNode;
    }

    if (range && el.contains(range.startContainer) && range.startContainer !== el) {
      return range.startContainer;
    }

    if (range && range.startContainer === el) {
      const child = el.childNodes[range.startOffset] ?? el.childNodes[Math.max(0, range.startOffset - 1)] ?? el.firstChild;
      if (child) return child;
    }

    if (sel.anchorNode === el) {
      const child = el.childNodes[sel.anchorOffset] ?? el.childNodes[Math.max(0, sel.anchorOffset - 1)] ?? el.firstChild;
      if (child) return child;
    }

    return null;
  }

  normalizeBlockLines(editor: HTMLElement): void {
    if (!editor) return;

    if (!editor.hasChildNodes()) {
      editor.innerHTML = '<div><br></div>';
      return;
    }

    const isBlockTag = (tag: string): boolean => {
      return ['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'blockquote', 'pre', 'hr', 'table'].includes(tag);
    };

    let needsNormalization = false;
    for (const child of Array.from(editor.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE && (child.textContent ?? '').trim()) {
        needsNormalization = true;
        break;
      }
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        const tag = el.tagName.toLowerCase();
        if (tag === 'br') {
          needsNormalization = true;
          break;
        }
        if (tag === 'div' || tag === 'p' || /^h[1-6]$/.test(tag)) {
          if (!el.classList.contains('tfm-check-item')) {
            const brs = el.querySelectorAll('br');
            const hasText = !!(el.textContent ?? '').trim();
            if (hasText && brs.length > 0) {
              needsNormalization = true;
              break;
            }
          }
        } else if (!isBlockTag(tag)) {
          needsNormalization = true;
          break;
        }
      }
    }

    if (!needsNormalization) {
      return;
    }

    const sel = typeof window !== 'undefined' ? window.getSelection() : null;
    let savedNode: Node | null = null;
    let savedOffset = 0;
    if (sel && sel.rangeCount > 0) {
      const r = sel.getRangeAt(0);
      if (editor.contains(r.startContainer)) {
        savedNode = r.startContainer;
        savedOffset = r.startOffset;
      }
    }

    const fragment = document.createDocumentFragment();
    let currentBucket: Node[] = [];

    const flushBucket = (tag = 'div') => {
      if (currentBucket.length === 0) return;
      const block = document.createElement(tag);
      for (const n of currentBucket) {
        block.appendChild(n);
      }
      if (!block.textContent?.trim() && !block.querySelector('img, a, input')) {
        block.innerHTML = '<br>';
      }
      fragment.appendChild(block);
      currentBucket = [];
    };

    for (const child of Array.from(editor.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        currentBucket.push(child);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        const tag = el.tagName.toLowerCase();

        if (tag === 'br') {
          flushBucket('div');
        } else if (!isBlockTag(tag)) {
          currentBucket.push(el);
        } else if (tag === 'div' || tag === 'p' || /^h[1-6]$/.test(tag)) {
          flushBucket('div');
          if (el.classList.contains('tfm-check-item')) {
            fragment.appendChild(el);
          } else {
            const brs = el.querySelectorAll('br');
            const hasText = !!(el.textContent ?? '').trim();
            if (hasText && brs.length > 0) {
              let subNodes: Node[] = [];
              let hadPreviousBr = false;
              for (const sub of Array.from(el.childNodes)) {
                if (sub.nodeType === Node.ELEMENT_NODE && (sub as Element).tagName.toLowerCase() === 'br') {
                  if (subNodes.length > 0) {
                    const subBlock = document.createElement(tag);
                    for (const sn of subNodes) subBlock.appendChild(sn);
                    if (!subBlock.textContent?.trim()) subBlock.innerHTML = '<br>';
                    fragment.appendChild(subBlock);
                    subNodes = [];
                  } else if (hadPreviousBr) {
                    const emptyBlock = document.createElement(tag);
                    emptyBlock.innerHTML = '<br>';
                    fragment.appendChild(emptyBlock);
                  }
                  hadPreviousBr = true;
                } else {
                  subNodes.push(sub);
                  hadPreviousBr = false;
                }
              }
              if (subNodes.length > 0) {
                const subBlock = document.createElement(tag);
                for (const sn of subNodes) subBlock.appendChild(sn);
                if (!subBlock.textContent?.trim()) subBlock.innerHTML = '<br>';
                fragment.appendChild(subBlock);
              }
            } else {
              fragment.appendChild(el);
            }
          }
        } else {
          flushBucket('div');
          fragment.appendChild(el);
        }
      }
    }
    flushBucket('div');

    editor.innerHTML = '';
    editor.appendChild(fragment);

    if (sel && savedNode && editor.contains(savedNode)) {
      try {
        const r = document.createRange();
        r.setStart(savedNode, Math.min(savedOffset, savedNode.textContent?.length ?? 0));
        r.collapse(true);
        sel.removeAllRanges();
        sel.addRange(r);
      } catch { /* restoring the caret is best effort */ }
    }
  }

  private getTargetBlocks(editor: HTMLElement, sel: Selection): HTMLElement[] {
    if (!sel || sel.rangeCount === 0) return [];
    const range = sel.getRangeAt(0);

    const startAnchor = this.getEditorAnchorNode(editor, sel) ?? (range && editor.contains(range.startContainer) ? range.startContainer : null);
    const endAnchor = (sel.focusNode && editor.contains(sel.focusNode) && sel.focusNode !== editor)
      ? sel.focusNode
      : (range && editor.contains(range.endContainer) && range.endContainer !== editor
          ? range.endContainer
          : startAnchor);

    const startBlock = this.findClosestBlockElement(startAnchor);
    const endBlock = this.findClosestBlockElement(endAnchor);

    if (!startBlock && !endBlock) {
      const first = editor.firstElementChild as HTMLElement | null;
      return first ? [first] : [];
    }

    if (!startBlock) return endBlock ? [endBlock] : [];
    if (!endBlock || startBlock === endBlock) return [startBlock];

    const allChildren = Array.from(editor.children) as HTMLElement[];
    const startIdx = allChildren.indexOf(startBlock);
    const endIdx = allChildren.indexOf(endBlock);

    if (startIdx === -1 || endIdx === -1) return [startBlock];

    const low = Math.min(startIdx, endIdx);
    const high = Math.max(startIdx, endIdx);
    return allChildren.slice(low, high + 1);
  }

  isSlashCommandActive(cmdId: string): boolean {
    const af = this.activeFormats();
    switch (cmdId) {
      case 'h1':
        return af.h1;
      case 'h2':
        return af.h2;
      case 'p':
        return !af.h1 && !af.h2 && !af.checklist && !af.bullet && !af.numbered && !af.code;
      case 'checklist':
        return af.checklist;
      case 'bullet':
        return af.bullet;
      case 'numbered':
        return af.numbered;
      case 'code':
        return af.code;
      case 'bold':
        return af.bold;
      case 'italic':
        return af.italic;
      case 'underline':
        return af.underline;
      case 'highlight':
        return af.highlight;
      case 'link':
        return af.link;
      default:
        return false;
    }
  }

  toggleHeading(tag: 'h1' | 'h2'): void {
    const el = this.contentEditor()?.nativeElement;
    if (!el) return;

    this.normalizeBlockLines(el);

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const blocks = this.getTargetBlocks(el, sel);
    if (blocks.length === 0) {
      const heading = document.createElement(tag);
      heading.appendChild(document.createElement('br'));
      el.appendChild(heading);
      const r = document.createRange();
      r.setStart(heading, 0);
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
      this.onEditorInput();
      this.updateActiveFormats();
      return;
    }

    const allAlreadyThisHeading = blocks.every((b) => b.tagName.toLowerCase() === tag);
    let lastCreated: HTMLElement | null = null;

    for (const block of blocks) {
      if (allAlreadyThisHeading) {
        // Toggle OFF -> convert to normal <div>
        const div = document.createElement('div');
        while (block.firstChild) {
          div.appendChild(block.firstChild);
        }
        if (!div.textContent?.trim()) {
          div.appendChild(document.createElement('br'));
        }
        block.replaceWith(div);
        lastCreated = div;
      } else {
        if (block.tagName.toLowerCase() === tag) {
          lastCreated = block;
          continue;
        }
        const heading = document.createElement(tag);
        if (block.classList.contains('tfm-check-item')) {
          const text = (block.querySelector('.tfm-check-text')?.textContent ?? block.textContent ?? '').trim();
          if (text) heading.textContent = text;
          else heading.appendChild(document.createElement('br'));
        } else {
          while (block.firstChild) {
            heading.appendChild(block.firstChild);
          }
          if (!heading.textContent?.trim()) {
            heading.appendChild(document.createElement('br'));
          }
        }
        block.replaceWith(heading);
        lastCreated = heading;
      }
    }

    if (lastCreated) {
      const r = document.createRange();
      if (lastCreated.firstChild) {
        r.selectNodeContents(lastCreated);
        r.collapse(false);
      } else {
        r.setStart(lastCreated, 0);
        r.collapse(true);
      }
      sel.removeAllRanges();
      sel.addRange(r);
    }

    this.onEditorInput();
    this.updateActiveFormats();
  }

  /** Toolbar headings are inline and affect only the selected text. Slash headings remain block-level. */
  formatSelectedHeading(tag: 'h1' | 'h2'): void {
    const editor = this.contentEditor()?.nativeElement;
    const sel = window.getSelection();
    if (!editor || !sel || sel.rangeCount === 0 || sel.isCollapsed) return;

    const range = sel.getRangeAt(0);
    if (!editor.contains(range.startContainer) || !editor.contains(range.endContainer)) return;

    const slices: { node: Text; start: number; end: number }[] = [];
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    let current = walker.nextNode();
    while (current) {
      const node = current as Text;
      if (range.intersectsNode(node)) {
        const start = node === range.startContainer ? range.startOffset : 0;
        const end = node === range.endContainer ? range.endOffset : node.data.length;
        if (end > start) slices.push({ node, start, end });
      }
      current = walker.nextNode();
    }

    if (slices.length === 0) return;

    const wrappers: HTMLElement[] = [];
    for (const slice of [...slices].reverse()) {
      let selectedNode = slice.node;
      if (slice.end < selectedNode.data.length) selectedNode.splitText(slice.end);
      if (slice.start > 0) selectedNode = selectedNode.splitText(slice.start);

      const wrapper = document.createElement('span');
      wrapper.className = `tfm-inline-${tag}`;
      selectedNode.parentNode?.insertBefore(wrapper, selectedNode);
      wrapper.appendChild(selectedNode);
      wrappers.push(wrapper);
    }

    wrappers.sort((a, b) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
    const firstWrapper = wrappers[0];
    const lastWrapper = wrappers[wrappers.length - 1];
    const selectionRange = document.createRange();
    selectionRange.setStart(firstWrapper.firstChild ?? firstWrapper, 0);
    const endNode = lastWrapper.lastChild ?? lastWrapper;
    selectionRange.setEnd(endNode, endNode.textContent?.length ?? 0);
    sel.removeAllRanges();
    sel.addRange(selectionRange);

    this.onEditorInput();
    this.updateActiveFormats();
  }

  formatNormalText(): void {
    const el = this.contentEditor()?.nativeElement;
    if (!el) return;

    this.normalizeBlockLines(el);

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const blocks = this.getTargetBlocks(el, sel);
    let lastCreated: HTMLElement | null = null;

    for (const block of blocks) {
      if (block.tagName.toLowerCase() === 'div' && !block.classList.contains('tfm-check-item')) {
        lastCreated = block;
        continue;
      }

      const div = document.createElement('div');
      if (block.classList.contains('tfm-check-item')) {
        const text = (block.querySelector('.tfm-check-text')?.textContent ?? block.textContent ?? '').trim();
        if (text) div.textContent = text;
        else div.appendChild(document.createElement('br'));
      } else {
        while (block.firstChild) {
          div.appendChild(block.firstChild);
        }
        if (!div.textContent?.trim()) {
          div.appendChild(document.createElement('br'));
        }
      }
      block.replaceWith(div);
      lastCreated = div;
    }

    if (lastCreated) {
      const r = document.createRange();
      if (lastCreated.firstChild) {
        r.selectNodeContents(lastCreated);
        r.collapse(false);
      } else {
        r.setStart(lastCreated, 0);
        r.collapse(true);
      }
      sel.removeAllRanges();
      sel.addRange(r);
    }

    this.onEditorInput();
    this.updateActiveFormats();
  }

  toggleChecklist(): void {
    const el = this.contentEditor()?.nativeElement;
    if (!el) return;

    this.normalizeBlockLines(el);

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const blocks = this.getTargetBlocks(el, sel);
    if (blocks.length === 0) {
      const item = this.createChecklistItem('');
      el.appendChild(item);
      const textSpan = item.querySelector('.tfm-check-text');
      const r = document.createRange();
      r.setStart(textSpan ?? item, 0);
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
      this.onEditorInput();
      this.updateActiveFormats();
      return;
    }

    const allChecklist = blocks.every((b) => b.classList.contains('tfm-check-item'));
    let lastCreated: HTMLElement | null = null;

    for (const block of blocks) {
      if (allChecklist) {
        // Toggle OFF -> convert to normal <div>
        const text = (block.querySelector('.tfm-check-text')?.textContent ?? block.textContent ?? '').trim();
        const div = document.createElement('div');
        if (text) div.textContent = text;
        else div.appendChild(document.createElement('br'));
        block.replaceWith(div);
        lastCreated = div;
      } else {
        if (block.classList.contains('tfm-check-item')) {
          lastCreated = block;
          continue;
        }
        const text = (block.textContent ?? '').trim();
        const item = this.createChecklistItem(text);
        block.replaceWith(item);
        lastCreated = item;
      }
    }

    if (lastCreated) {
      const textSpan = lastCreated.querySelector('.tfm-check-text') ?? lastCreated;
      const r = document.createRange();
      if (textSpan.firstChild) {
        r.selectNodeContents(textSpan);
        r.collapse(false);
      } else {
        r.setStart(textSpan, 0);
        r.collapse(true);
      }
      sel.removeAllRanges();
      sel.addRange(r);
    }

    this.onEditorInput();
    this.updateActiveFormats();
  }

  toggleCode(): void {
    const el = this.contentEditor()?.nativeElement;
    if (!el) return;

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const anchor = this.getEditorAnchorNode(el, sel);
    if (!anchor) return;

    let curr: HTMLElement | null = anchor instanceof HTMLElement ? anchor : (anchor.parentElement ?? null);
    let codeEl: HTMLElement | null = null;
    while (curr && curr !== el) {
      if (curr.tagName.toLowerCase() === 'code' || curr.classList.contains('tfm-inline-code')) {
        codeEl = curr;
        break;
      }
      curr = curr.parentElement;
    }

    if (codeEl && codeEl.parentElement) {
      // Turn code OFF -> unwrap code element into plain text
      const text = codeEl.textContent ?? '';
      const textNode = document.createTextNode(text);
      codeEl.parentElement.replaceChild(textNode, codeEl);

      const r = document.createRange();
      r.setStartAfter(textNode);
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
      this.onEditorInput();
      this.updateActiveFormats();
      return;
    }

    this.formatCode();
    this.updateActiveFormats();
  }

  formatCode(): void {
    const el = this.contentEditor()?.nativeElement;
    if (!el) return;

    const selection = window.getSelection();
    const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    const anchor = this.getEditorAnchorNode(el, selection);

    if (selection && range && anchor && !selection.isCollapsed) {
      const code = document.createElement('code');
      code.className = 'tfm-inline-code';
      code.textContent = selection.toString();
      range.deleteContents();
      range.insertNode(code);

      const space = document.createTextNode('\u00A0');
      code.after(space);
      const nextRange = document.createRange();
      nextRange.setStartAfter(space);
      nextRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(nextRange);
    } else {
      const code = document.createElement('code');
      code.className = 'tfm-inline-code';
      code.textContent = 'code';

      let r: Range;
      if (range && anchor) {
        r = range;
      } else {
        r = document.createRange();
        r.selectNodeContents(el);
        r.collapse(false);
      }
      r.deleteContents();
      r.insertNode(code);

      const selectRange = document.createRange();
      selectRange.selectNodeContents(code);
      selection?.removeAllRanges();
      selection?.addRange(selectRange);
    }
    this.onEditorInput();
    this.updateActiveFormats();
  }

  formatList(type: 'unordered' | 'ordered'): void {
    const el = this.contentEditor()?.nativeElement;
    if (!el) return;

    this.normalizeBlockLines(el);

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const listTag = type === 'unordered' ? 'ul' : 'ol';
    const blocks = this.getTargetBlocks(el, sel);

    if (blocks.length === 0) {
      const list = document.createElement(listTag);
      const li = document.createElement('li');
      li.appendChild(document.createElement('br'));
      list.appendChild(li);
      el.appendChild(list);
      const r = document.createRange();
      r.setStart(li, 0);
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
      this.onEditorInput();
      this.updateActiveFormats();
      return;
    }

    const allThisList = blocks.every((b) => b.tagName.toLowerCase() === listTag);
    let lastCreated: HTMLElement | null = null;

    for (const block of blocks) {
      if (allThisList) {
        const lis = Array.from(block.querySelectorAll('li'));
        if (lis.length > 0) {
          for (const li of lis) {
            const div = document.createElement('div');
            while (li.firstChild) div.appendChild(li.firstChild);
            if (!div.textContent?.trim()) div.appendChild(document.createElement('br'));
            block.before(div);
            lastCreated = div;
          }
          block.remove();
        } else {
          const div = document.createElement('div');
          div.appendChild(document.createElement('br'));
          block.replaceWith(div);
          lastCreated = div;
        }
      } else {
        const list = document.createElement(listTag);
        const li = document.createElement('li');
        if (block.classList.contains('tfm-check-item')) {
          const text = (block.querySelector('.tfm-check-text')?.textContent ?? block.textContent ?? '').trim();
          if (text) li.textContent = text;
          else li.appendChild(document.createElement('br'));
        } else {
          while (block.firstChild) li.appendChild(block.firstChild);
          if (!li.textContent?.trim()) li.appendChild(document.createElement('br'));
        }
        list.appendChild(li);
        block.replaceWith(list);
        lastCreated = li;
      }
    }

    if (lastCreated) {
      const r = document.createRange();
      if (lastCreated.firstChild) {
        r.selectNodeContents(lastCreated);
        r.collapse(false);
      } else {
        r.setStart(lastCreated, 0);
        r.collapse(true);
      }
      sel.removeAllRanges();
      sel.addRange(r);
    }

    this.onEditorInput();
    this.updateActiveFormats();
  }

  createChecklistItem(text: string): HTMLElement {
    const item = document.createElement('div');
    item.className = 'tfm-check-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.setAttribute('contenteditable', 'false');

    const span = document.createElement('span');
    span.className = 'tfm-check-text';
    if (text) {
      span.textContent = text;
    } else {
      span.appendChild(document.createElement('br'));
    }

    item.appendChild(checkbox);
    item.appendChild(span);
    return item;
  }

  toggleLinkPopover(event: MouseEvent): void {
    event.stopPropagation();
    if (this.showLinkPopover()) {
      this.showLinkPopover.set(false);
      return;
    }
    this.toggleLinkPopoverDirect();
  }

  toggleLinkPopoverDirect(): void {
    this.closePopovers();
    const el = this.contentEditor()?.nativeElement;
    const sel = window.getSelection();
    let existingAnchor: HTMLAnchorElement | null = null;

    if (el && sel && sel.rangeCount > 0) {
      const anchorNode = this.getEditorAnchorNode(el, sel);
      let curr: HTMLElement | null = anchorNode instanceof HTMLElement ? anchorNode : (anchorNode?.parentElement ?? null);
      while (curr && curr !== el) {
        if (curr.tagName.toLowerCase() === 'a') {
          existingAnchor = curr as HTMLAnchorElement;
          break;
        }
        curr = curr.parentElement;
      }
    }

    if (existingAnchor) {
      const r = document.createRange();
      r.selectNode(existingAnchor);
      sel?.removeAllRanges();
      sel?.addRange(r);
      this.savedLinkRange = r.cloneRange();
      this.linkTextInput.set(existingAnchor.textContent ?? '');
      this.linkUrlInput.set(existingAnchor.getAttribute('href') ?? existingAnchor.href ?? '');
    } else if (el && sel && sel.rangeCount > 0 && el.contains(sel.anchorNode)) {
      this.savedLinkRange = sel.getRangeAt(0).cloneRange();
      const text = this.savedLinkRange.toString().trim();
      this.linkTextInput.set(text);
      this.linkUrlInput.set('');
    } else {
      this.savedLinkRange = null;
      this.linkTextInput.set('');
      this.linkUrlInput.set('');
    }
    this.showLinkPopover.set(true);
  }

  applyLink(): void {
    const url = this.linkUrlInput().trim();
    if (!url) return;
    const href = /^(?:f|ht)tps?:\/\//i.test(url) || url.startsWith('mailto:') ? url : `https://${url}`;
    const displayText = this.linkTextInput().trim() || url;

    const el = this.contentEditor()?.nativeElement;
    if (!el) return;
    el.focus();

    const sel = window.getSelection();
    const a = document.createElement('a');
    a.href = href;
    a.textContent = displayText;
    a.target = '_blank';
    a.rel = 'noopener';
    a.className = 'tfm-preview-link';
    a.title = `Ctrl+Click to open link (${href})`;

    if (this.savedLinkRange && el.contains(this.savedLinkRange.commonAncestorContainer)) {
      this.savedLinkRange.deleteContents();
      this.savedLinkRange.insertNode(a);
    } else {
      el.appendChild(a);
    }

    const space = document.createTextNode('\u00A0');
    a.after(space);

    const newRange = document.createRange();
    newRange.setStartAfter(space);
    newRange.collapse(true);
    sel?.removeAllRanges();
    sel?.addRange(newRange);

    this.showLinkPopover.set(false);
    this.onEditorInput();
    this.updateActiveFormats();
  }

  removeLink(): void {
    const el = this.contentEditor()?.nativeElement;
    const sel = window.getSelection();
    if (!el || !sel || sel.rangeCount === 0) return;

    const anchorNode = this.getEditorAnchorNode(el, sel);
    let curr: HTMLElement | null = anchorNode instanceof HTMLElement ? anchorNode : (anchorNode?.parentElement ?? null);
    let existingAnchor: HTMLAnchorElement | null = null;
    while (curr && curr !== el) {
      if (curr.tagName.toLowerCase() === 'a') {
        existingAnchor = curr as HTMLAnchorElement;
        break;
      }
      curr = curr.parentElement;
    }

    if (existingAnchor && existingAnchor.parentElement) {
      const text = existingAnchor.textContent ?? '';
      const textNode = document.createTextNode(text);
      existingAnchor.parentElement.replaceChild(textNode, existingAnchor);

      const r = document.createRange();
      r.setStartAfter(textNode);
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
    }

    this.showLinkPopover.set(false);
    this.onEditorInput();
    this.updateActiveFormats();
  }

  toggleTextColorPopover(event: MouseEvent): void {
    event.stopPropagation();
    if (this.showTextColorPopover()) {
      this.showTextColorPopover.set(false);
      return;
    }
    this.closePopovers();
    this.saveColorSelectionRange();
    this.showTextColorPopover.set(true);
  }

  toggleHighlightPopover(event: MouseEvent): void {
    event.stopPropagation();
    if (this.showHighlightPopover()) {
      this.showHighlightPopover.set(false);
      return;
    }
    this.closePopovers();
    this.saveColorSelectionRange();
    this.showHighlightPopover.set(true);
  }

  private saveColorSelectionRange(): void {
    const el = this.contentEditor()?.nativeElement;
    const sel = window.getSelection();
    this.savedColorRange = el && sel && sel.rangeCount > 0 && el.contains(sel.anchorNode)
      ? sel.getRangeAt(0).cloneRange()
      : null;
  }

  private restoreColorSelectionRange(): void {
    const el = this.contentEditor()?.nativeElement;
    if (!el) return;
    el.focus();
    if (this.savedColorRange && el.contains(this.savedColorRange.commonAncestorContainer)) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(this.savedColorRange);
    }
  }

  applyTextColor(hex: string | null): void {
    this.restoreColorSelectionRange();
    const useCss = this.cssStyles() && !this.isBasic();
    document.execCommand('styleWithCSS', false, useCss ? 'true' : 'false');
    document.execCommand('foreColor', false, hex ?? (useCss ? 'inherit' : '#1e293b'));
    this.showTextColorPopover.set(false);
    this.onEditorInput();
  }

  applyHighlight(hex: string | null): void {
    this.restoreColorSelectionRange();
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand('hiliteColor', false, hex ?? 'transparent');
    this.showHighlightPopover.set(false);
    this.onEditorInput();
  }

  async onImageFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const selection = window.getSelection();
    const savedRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;

    try {
      const uploader = this.imageUploader;
      if (!uploader) return;
      const uploaded = await firstValueFrom(uploader.upload(file, this.imageUploadPurpose()));

      if (selection && savedRange) {
        selection.removeAllRanges();
        selection.addRange(savedRange);
      }
      document.execCommand('insertImage', false, uploaded.url);
      this.onEditorInput();
    } catch {
      this.uploadFailed.emit(`Failed to insert ${file.name}.`);
    } finally {
      input.value = '';
    }
  }

  onEditorInput(): void {
    const el = this.contentEditor()?.nativeElement;
    if (!el) return;
    const raw = el.innerHTML.trim();
    const empty = this.isElementVisuallyEmpty(el);
    this.contentEmpty.set(empty);
    this.textLength.set(this.visibleTextLength(el));
    // Pasted web content can carry <svg>/<style> or handlers the backend rejects; emit it cleaned.
    const html = empty ? '' : sanitizeEditableHtml(raw);
    if (!this.restoringHistory) this.recordHistory(html);
    this.emitHtml(html);
    this.checkSlashMenuTrigger();
    if (this.mentionCandidates() !== null) {
      this.emitMentionsIfChanged(el);
      this.checkMentionTrigger();
    }
  }

  /**
   * Stops typing, pasting and dropping text past maxLength. A paste or drop that would overflow is
   * cut to the room left and inserted as plain text. IME composition can't be cancelled; the
   * counter then shows how far over the limit the text is.
   */
  onEditorBeforeInput(event: InputEvent): void {
    const max = this.maxLength();
    if (!max || !event.inputType.startsWith('insert')) return;
    const incoming = this.incomingText(event);
    if (incoming === null) return;
    const selected = window.getSelection()?.toString().length ?? 0;
    const room = max - (this.textLength() - selected);
    if (incoming.length <= room) return;
    if (event.inputType === 'insertCompositionText') return;
    event.preventDefault();
    if (room > 0 && (event.inputType === 'insertFromPaste' || event.inputType === 'insertFromDrop')) {
      document.execCommand('insertText', false, incoming.slice(0, room));
    }
  }

  /** Text an insert would add; null when it adds no characters (Enter, line breaks). */
  private incomingText(event: InputEvent): string | null {
    if (event.inputType === 'insertParagraph' || event.inputType === 'insertLineBreak') return null;
    if (event.data !== null) return event.data;
    const text = event.dataTransfer?.getData('text/plain');
    return text ?? null;
  }

  private visibleTextLength(el: HTMLElement): number {
    const zeroWidthSpace = String.fromCharCode(0x200b);
    return (el.textContent ?? '').split(zeroWidthSpace).join('').length;
  }

  private isElementVisuallyEmpty(el: HTMLElement): boolean {
    const text = (el.textContent ?? '').replace(/\u00a0/g, ' ').trim();
    const hasEmbeddedContent = el.querySelector('img, hr, input, video, audio, iframe') !== null;
    return text.length === 0 && !hasEmbeddedContent;
  }

  private resetHistory(html: string): void {
    this.editHistory = [html];
    this.historyIndex = 0;
  }

  private recordHistory(html: string): void {
    if (this.editHistory[this.historyIndex] === html) return;
    this.editHistory = this.editHistory.slice(0, this.historyIndex + 1);
    this.editHistory.push(html);
    if (this.editHistory.length > 100) this.editHistory.shift();
    this.historyIndex = this.editHistory.length - 1;
  }

  undo(): void {
    if (this.historyIndex === 0) return;
    this.restoreHistory(this.historyIndex - 1);
  }

  redo(): void {
    if (this.historyIndex >= this.editHistory.length - 1) return;
    this.restoreHistory(this.historyIndex + 1);
  }

  private restoreHistory(index: number): void {
    const el = this.contentEditor()?.nativeElement;
    if (!el) return;

    this.historyIndex = index;
    const html = this.editHistory[index] ?? '';
    this.restoringHistory = true;
    try {
      el.innerHTML = html;
      const empty = this.isElementVisuallyEmpty(el);
      this.contentEmpty.set(empty);
      this.textLength.set(this.visibleTextLength(el));
      this.emitHtml(empty ? '' : el.innerHTML);
      this.closeSlashMenu();

      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      this.updateActiveFormats();
    } finally {
      this.restoringHistory = false;
    }
  }

  onEditorFocus(): void {
    try {
      document.execCommand('defaultParagraphSeparator', false, 'div');
    } catch { /* older browsers may not support this command */ }
  }

  onEditorChange(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    if (target && target.type === 'checkbox') {
      const parent = target.closest('.tfm-check-item, .tfm-editor-check-item') as HTMLElement | null;
      if (parent) {
        if (target.checked) {
          target.setAttribute('checked', 'checked');
          parent.classList.add('is-checked');
        } else {
          target.removeAttribute('checked');
          parent.classList.remove('is-checked');
        }
      }
      this.onEditorInput();
    }
  }

  onEditorKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && !event.altKey) {
      const key = event.key.toLowerCase();
      if (key === 'z') {
        event.preventDefault();
        if (event.shiftKey) this.redo();
        else this.undo();
        return;
      }
      if (key === 'y') {
        event.preventDefault();
        this.redo();
        return;
      }
    }

    if (this.showMentionMenu() && this.handleMentionMenuKey(event)) {
      return;
    }

    if (this.showSlashMenu()) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const items = this.filteredSlashCommands();
        if (items.length > 0) {
          this.slashSelectedIndex.update((idx) => (idx + 1) % items.length);
          this.scrollActiveSlashItemIntoView();
        }
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        const items = this.filteredSlashCommands();
        if (items.length > 0) {
          this.slashSelectedIndex.update((idx) => (idx - 1 + items.length) % items.length);
          this.scrollActiveSlashItemIntoView();
        }
        return;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        const items = this.filteredSlashCommands();
        if (items.length > 0) {
          event.preventDefault();
          const selected = items[this.slashSelectedIndex()] ?? items[0];
          this.executeSlashCommand(selected.id);
          return;
        }
        this.closeSlashMenu();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        this.closeSlashMenu();
        return;
      }
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      if (this.submitOnEnter() && !event.isComposing) {
        event.preventDefault();
        this.submitRequested.emit();
        return;
      }
      if (this.handleEnterKey(event)) {
        return;
      }
    }

    if (event.key === 'Backspace') {
      if (this.handleBackspaceKey(event)) {
        return;
      }
    }
  }

  private findClosestCheckItem(node: Node | null): HTMLElement | null {
    const editor = this.contentEditor()?.nativeElement;
    if (!editor || !node || !editor.contains(node) || node === editor) return null;
    let curr: HTMLElement | null = node instanceof HTMLElement ? node : (node.parentElement ?? null);
    while (curr && curr !== editor) {
      if (curr.classList.contains('tfm-check-item') || curr.classList.contains('tfm-editor-check-item')) return curr;
      curr = curr.parentElement;
    }
    return null;
  }

  private findClosestHeading(node: Node | null): HTMLElement | null {
    const editor = this.contentEditor()?.nativeElement;
    if (!editor || !node || !editor.contains(node) || node === editor) return null;
    let curr: HTMLElement | null = node instanceof HTMLElement ? node : (node.parentElement ?? null);
    while (curr && curr !== editor) {
      if (/^H[1-6]$/i.test(curr.tagName)) return curr;
      curr = curr.parentElement;
    }
    return null;
  }

  private findClosestInlineHeading(node: Node | null): HTMLElement | null {
    const editor = this.contentEditor()?.nativeElement;
    if (!editor || !node || !editor.contains(node) || node === editor) return null;
    let curr: HTMLElement | null = node instanceof HTMLElement ? node : (node.parentElement ?? null);
    while (curr && curr !== editor) {
      if (curr.classList.contains('tfm-inline-h1') || curr.classList.contains('tfm-inline-h2')) return curr;
      curr = curr.parentElement;
    }
    return null;
  }

  private findClosestBlockElement(node: Node | null): HTMLElement | null {
    const editor = this.contentEditor()?.nativeElement;
    if (!editor || !node || !editor.contains(node) || node === editor) return null;
    let curr: HTMLElement | null = node instanceof HTMLElement ? node : (node.parentElement ?? null);
    if (!curr || curr === editor) return null;
    while (curr && curr.parentElement && curr.parentElement !== editor) {
      curr = curr.parentElement;
    }
    return curr;
  }

  private handleEnterKey(event: KeyboardEvent): boolean {
    const editorEl = this.contentEditor()?.nativeElement;
    if (!editorEl) return false;

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;

    const range = sel.getRangeAt(0);
    const anchorNode = (sel.anchorNode && editorEl.contains(sel.anchorNode))
      ? sel.anchorNode
      : (range && editorEl.contains(range.startContainer) ? range.startContainer : null);

    if (!anchorNode) return false;

    const checkItem = this.findClosestCheckItem(anchorNode);
    if (checkItem) {
      event.preventDefault();
      this.handleChecklistEnter(checkItem, sel);
      return true;
    }

    const heading = this.findClosestHeading(anchorNode);
    if (heading) {
      event.preventDefault();
      this.handleHeadingEnter(heading, sel);
      return true;
    }

    return false;
  }

  private handleChecklistEnter(checkItem: HTMLElement, sel: Selection): void {
    const textSpan = checkItem.querySelector('.tfm-check-text') as HTMLElement | null;
    const itemText = (textSpan ? textSpan.textContent : checkItem.textContent)?.replace(/\s+/g, ' ').trim() ?? '';

    if (!itemText) {
      const normalLine = document.createElement('div');
      normalLine.appendChild(document.createElement('br'));
      checkItem.replaceWith(normalLine);

      const r = document.createRange();
      r.setStart(normalLine, 0);
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
      this.onEditorInput();
      return;
    }

    const newItem = this.createChecklistItem('');
    checkItem.after(newItem);

    const range = sel.getRangeAt(0);
    if (textSpan && textSpan.contains(range.startContainer)) {
      const fullText = textSpan.textContent ?? '';
      const offset = range.startOffset;
      if (offset < fullText.length) {
        const remaining = fullText.slice(offset);
        textSpan.textContent = fullText.slice(0, offset);
        const newSpan = newItem.querySelector('.tfm-check-text');
        if (newSpan) {
          newSpan.textContent = remaining;
        }
      }
    }

    const targetSpan = newItem.querySelector('.tfm-check-text') ?? newItem;
    const newRange = document.createRange();
    if (targetSpan.firstChild) {
      newRange.setStart(targetSpan.firstChild, 0);
    } else {
      newRange.setStart(targetSpan, 0);
    }
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);

    this.onEditorInput();
  }

  private handleHeadingEnter(heading: HTMLElement, sel: Selection): void {
    const range = sel.getRangeAt(0);
    const isAtEnd = (range.startContainer === heading.lastChild || range.startContainer === heading) &&
                    range.startOffset >= (range.startContainer.textContent?.length ?? 0);

    const normalLine = document.createElement('div');
    normalLine.appendChild(document.createElement('br'));

    if (isAtEnd || !(heading.textContent ?? '').trim()) {
      heading.after(normalLine);
    } else {
      const headingRange = document.createRange();
      headingRange.setStart(range.startContainer, range.startOffset);
      headingRange.setEndAfter(heading.lastChild ?? heading);
      const afterContent = headingRange.extractContents();
      normalLine.innerHTML = '';
      normalLine.appendChild(afterContent);
      if (!normalLine.textContent?.trim()) {
        normalLine.appendChild(document.createElement('br'));
      }
      heading.after(normalLine);
    }

    const newRange = document.createRange();
    newRange.setStart(normalLine, 0);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);

    this.onEditorInput();
  }

  private handleBackspaceKey(event: KeyboardEvent): boolean {
    const editorEl = this.contentEditor()?.nativeElement;
    if (!editorEl) return false;

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return false;

    const range = sel.getRangeAt(0);
    const anchorNode = (sel.anchorNode && editorEl.contains(sel.anchorNode))
      ? sel.anchorNode
      : (range && editorEl.contains(range.startContainer) ? range.startContainer : null);

    if (!anchorNode) return false;

    const checkItem = this.findClosestCheckItem(anchorNode);
    if (checkItem) {
      const textSpan = checkItem.querySelector('.tfm-check-text');
      const text = (textSpan?.textContent ?? checkItem.textContent ?? '').replace(/\s+/g, ' ').trim();

      if (!text || (range.startOffset === 0 && (range.startContainer === textSpan || range.startContainer === textSpan?.firstChild))) {
        event.preventDefault();
        const normalLine = document.createElement('div');
        if (text) {
          normalLine.textContent = text;
        } else {
          normalLine.appendChild(document.createElement('br'));
        }
        checkItem.replaceWith(normalLine);

        const r = document.createRange();
        r.setStart(normalLine, 0);
        r.collapse(true);
        sel.removeAllRanges();
        sel.addRange(r);
        this.onEditorInput();
        return true;
      }
    }

    return false;
  }

  onEditorBlur(): void {
    setTimeout(() => {
      this.closeSlashMenu();
    }, 200);
  }

  onEditorClick(event?: MouseEvent): void {
    if (event) {
      const target = event.target as HTMLElement | null;
      const link = target?.closest('a') as HTMLAnchorElement | null;
      if (link && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        event.stopPropagation();
        const href = link.getAttribute('href') || link.href;
        if (href) {
          window.open(href, '_blank', 'noopener,noreferrer');
        }
        return;
      }
    }
    this.checkSlashMenuTrigger();
    this.updateActiveFormats();
  }

  onEditorSurfaceClick(event: MouseEvent): void {
    if (!this.readOnly() && this.activateOnClick() && !this.editorActive()) {
      this.editorActive.set(true);
      setTimeout(() => this.focus());
      return;
    }
    this.onEditorClick(event);
  }

  onEditorSurfaceKeydown(event: KeyboardEvent): void {
    if (!this.readOnly() && this.activateOnClick() && !this.editorActive()) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.editorActive.set(true);
        setTimeout(() => this.focus());
      }
      return;
    }
    if (!this.readOnly()) this.onEditorKeydown(event);
  }

  onEditorScroll(): void {
    if (this.showSlashMenu()) {
      this.closeSlashMenu();
    }
  }

  onEditorKeyup(): void {
    this.updateActiveFormats();
  }

  onEditorMouseup(): void {
    this.updateActiveFormats();
  }

  updateActiveFormats(): void {
    const el = this.contentEditor()?.nativeElement;
    if (!el) return;

    const sel = typeof window !== 'undefined' ? window.getSelection() : null;
    if (!sel || sel.rangeCount === 0) {
      this.activeFormats.set({
        bold: false,
        italic: false,
        underline: false,
        h1: false,
        h2: false,
        code: false,
        bullet: false,
        numbered: false,
        checklist: false,
        highlight: false,
        link: false
      });
      return;
    }

    const anchor = this.getEditorAnchorNode(el, sel);

    if (!anchor) {
      this.activeFormats.set({
        bold: false,
        italic: false,
        underline: false,
        h1: false,
        h2: false,
        code: false,
        bullet: false,
        numbered: false,
        checklist: false,
        highlight: false,
        link: false
      });
      return;
    }

    let isBold = false;
    let browserBold = false;
    let isItalic = false;
    let isUnderline = false;
    let isBullet = false;
    let isNumbered = false;

    try {
      if (typeof document !== 'undefined' && typeof document.queryCommandState === 'function') {
        browserBold = document.queryCommandState('bold');
        isItalic = document.queryCommandState('italic');
        isUnderline = document.queryCommandState('underline');
        isBullet = document.queryCommandState('insertUnorderedList');
        isNumbered = document.queryCommandState('insertOrderedList');
      }
    } catch { /* queryCommandState can throw outside an editable selection */ }

    const checkItem = this.findClosestCheckItem(anchor);
    const heading = this.findClosestHeading(anchor);
    const inlineHeading = this.findClosestInlineHeading(anchor);
    const isH1 = heading?.tagName.toLowerCase() === 'h1' || inlineHeading?.classList.contains('tfm-inline-h1') === true;
    const isH2 = heading?.tagName.toLowerCase() === 'h2' || inlineHeading?.classList.contains('tfm-inline-h2') === true;

    let curr: HTMLElement | null = anchor instanceof HTMLElement ? anchor : (anchor?.parentElement ?? null);
    let isCode = false;
    let isHighlight = false;
    let isLink = false;
    let hasExplicitUnderline = false;

    while (curr && curr !== el) {
      const tag = curr.tagName.toLowerCase();
      if (tag === 'a') isLink = true;
      if (tag === 'u') hasExplicitUnderline = true;
      if (tag !== 'a' && curr.style.textDecoration?.includes('underline')) hasExplicitUnderline = true;
      if (tag === 'code' || tag === 'pre' || curr.classList.contains('tfm-inline-code')) isCode = true;
      if (tag === 'b' || tag === 'strong' || curr.style.fontWeight === 'bold' || curr.style.fontWeight === '700') isBold = true;
      if (tag === 'i' || tag === 'em' || curr.style.fontStyle === 'italic') isItalic = true;
      if (tag === 'ul') isBullet = true;
      if (tag === 'ol') isNumbered = true;
      if (tag === 'mark' || (curr.style.backgroundColor && curr.style.backgroundColor !== 'transparent' && curr.style.backgroundColor !== 'inherit')) {
        isHighlight = true;
      }
      curr = curr.parentElement;
    }

    // queryCommandState('bold') is true inside H1/H2 because headings are bold by default.
    // Keep that from falsely activating B, while retaining native pending-bold state on normal text.
    if (!isBold && browserBold && !heading) isBold = true;

    // Browsers natively return queryCommandState('underline') = true for <a> because links have default CSS underline.
    // Text in a link is only user-underlined if wrapped in <u> or having explicit inline text-decoration: underline.
    if (isLink && !hasExplicitUnderline) {
      isUnderline = false;
    } else if (hasExplicitUnderline) {
      isUnderline = true;
    }

    this.activeFormats.set({
      bold: isBold,
      italic: isItalic,
      underline: isUnderline,
      h1: isH1,
      h2: isH2,
      code: isCode,
      bullet: isBullet,
      numbered: isNumbered,
      checklist: !!checkItem,
      highlight: isHighlight,
      link: isLink
    });
  }

  getSlashTriggerContext(): { query: string; range: Range; textNode: Node; slashOffset: number } | null {
    const el = this.contentEditor()?.nativeElement;
    if (!el) return null;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return null;

    const anchorNode = sel.anchorNode;
    if (!anchorNode || !el.contains(anchorNode)) return null;

    if (anchorNode.nodeType !== Node.TEXT_NODE) return null;

    const text = anchorNode.textContent ?? '';
    const cursorPos = sel.anchorOffset;
    const textBeforeCursor = text.slice(0, cursorPos);

    const lastSlashIdx = textBeforeCursor.lastIndexOf('/');
    if (lastSlashIdx === -1) return null;

    if (lastSlashIdx > 0 && !/\s/.test(textBeforeCursor[lastSlashIdx - 1])) {
      return null;
    }

    const query = textBeforeCursor.slice(lastSlashIdx + 1);
    if (/\s/.test(query)) {
      return null;
    }

    return {
      query,
      range: sel.getRangeAt(0),
      textNode: anchorNode,
      slashOffset: lastSlashIdx
    };
  }

  updateSlashMenuPosition(range: Range): void {
    const coords = this.computeMenuCoords(range);
    if (coords === 'hidden') {
      this.closeSlashMenu();
    } else if (coords) {
      this.slashMenuCoords.set(coords);
    }
  }

  /** Popover placement under (or above) the caret; 'hidden' when the caret is scrolled out of view. */
  private computeMenuCoords(range: Range): SlashMenuCoords | 'hidden' | null {
    const editorEl = this.contentEditor()?.nativeElement;
    if (!editorEl) return null;

    try {
      const containerEl = (editorEl.closest('.tfm-editor') as HTMLElement) || editorEl;
      const containerRect = containerEl.getBoundingClientRect();
      const editorRect = editorEl.getBoundingClientRect();
      let rangeRect = range.getBoundingClientRect();

      // If rangeRect is collapsed or has 0 dimensions, fallback to client rects or editor bounds
      if (!rangeRect.width && !rangeRect.height && !rangeRect.top && !rangeRect.bottom) {
        const clientRects = range.getClientRects();
        if (clientRects.length > 0) {
          rangeRect = clientRects[0];
        } else {
          rangeRect = editorRect;
        }
      }

      // If caret is scrolled outside the visible content area of the editor, close slash menu
      if (editorEl.scrollHeight > editorEl.clientHeight) {
        if (rangeRect.bottom < editorRect.top || rangeRect.top > editorRect.bottom) {
          return 'hidden';
        }
      }

      // Find clipping or scrollable ancestor (such as .tfm__body in task modal)
      let clippingBottom = typeof window !== 'undefined' ? window.innerHeight : 800;
      let clippingTop = 0;
      if (typeof window !== 'undefined') {
        let parent = containerEl.parentElement;
        while (parent && parent !== document.body && parent !== document.documentElement) {
          const style = window.getComputedStyle(parent);
          const overflowY = style.overflowY;
          if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'hidden') {
            const parentRect = parent.getBoundingClientRect();
            clippingBottom = Math.min(clippingBottom, parentRect.bottom);
            clippingTop = Math.max(clippingTop, parentRect.top);
            break;
          }
          parent = parent.parentElement;
        }
      }

      const caretBottom = rangeRect.bottom || editorRect.bottom;
      const caretTop = rangeRect.top || editorRect.top;

      const spaceBelow = clippingBottom - caretBottom;
      const spaceAbove = caretTop - clippingTop;

      // Normal slash menu desired height is ~310px. If space below is not enough and space above has more room, open upward!
      const openUpward = spaceBelow < 310 && spaceAbove > spaceBelow;

      let top: number | null = null;
      let bottom: number | null = null;
      let maxHeight = 310;

      if (openUpward) {
        // Position upward: bottom edge of slash menu sits 6px above caret line
        bottom = Math.max(0, containerRect.bottom - caretTop + 6);
        maxHeight = Math.min(310, Math.max(120, Math.floor(spaceAbove - 16)));
      } else {
        // Position downward: top edge sits 6px below caret line
        top = Math.max(0, caretBottom - containerRect.top + 6);
        maxHeight = Math.min(310, Math.max(120, Math.floor(spaceBelow - 16)));
      }

      // Horizontal position constrained within container
      let left = Math.max(8, rangeRect.left - containerRect.left);
      const maxLeft = Math.max(8, containerRect.width - 316);
      if (left > maxLeft) {
        left = maxLeft;
      }

      return { top, bottom, left, openUpward, maxHeight };
    } catch {
      return { top: 36, bottom: null, left: 12, openUpward: false, maxHeight: 310 };
    }
  }

  removeSlashToken(): void {
    const el = this.contentEditor()?.nativeElement;
    if (!el) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const ctx = this.getSlashTriggerContext();
    if (ctx && ctx.textNode) {
      const text = ctx.textNode.textContent ?? '';
      const beforeSlash = text.slice(0, ctx.slashOffset);
      const afterCursor = text.slice(ctx.slashOffset + 1 + ctx.query.length);
      ctx.textNode.textContent = beforeSlash + afterCursor;

      const newRange = document.createRange();
      newRange.setStart(ctx.textNode, ctx.slashOffset);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }
  }

  checkSlashMenuTrigger(): void {
    const ctx = this.getSlashTriggerContext();
    if (!ctx) {
      this.closeSlashMenu();
      return;
    }

    this.updateActiveFormats();
    this.slashQuery.set(ctx.query);
    this.slashSelectedIndex.set(0);
    this.updateSlashMenuPosition(ctx.range);
    this.showSlashMenu.set(true);
  }

  closeSlashMenu(): void {
    this.showSlashMenu.set(false);
    this.slashQuery.set('');
    this.slashSelectedIndex.set(0);
  }

  /** Same rules as the "/" trigger: "@" at the start or after whitespace, no whitespace in the query. */
  /** Every htmlChange goes through here; the basic toolset never emits markup outside its allowlist. */
  private emitHtml(html: string): void {
    this.htmlChange.emit(this.isBasic() ? sanitizeBasicRichHtml(html) : html);
  }

  private getMentionTriggerContext(): MentionTriggerContext | null {
    if (this.isBasic()) return null;
    const el = this.contentEditor()?.nativeElement;
    const sel = window.getSelection();
    if (!el || !sel || sel.rangeCount === 0 || !sel.isCollapsed) return null;
    const anchorNode = sel.anchorNode;
    if (!anchorNode || !el.contains(anchorNode) || anchorNode.nodeType !== Node.TEXT_NODE) return null;

    const textBeforeCursor = (anchorNode.textContent ?? '').slice(0, sel.anchorOffset);
    const atOffset = textBeforeCursor.lastIndexOf('@');
    if (atOffset === -1) return null;
    if (atOffset > 0 && !/\s/.test(textBeforeCursor[atOffset - 1])) return null;
    const query = textBeforeCursor.slice(atOffset + 1);
    if (/\s/.test(query)) return null;

    return { query, range: sel.getRangeAt(0), textNode: anchorNode, atOffset };
  }

  private checkMentionTrigger(): void {
    const ctx = this.getMentionTriggerContext();
    if (!ctx) {
      if (this.showMentionMenu()) this.closeMentionMenu();
      return;
    }
    this.pendingMention = ctx;
    this.mentionQuery.set(ctx.query);
    this.mentionSelectedIndex.set(0);
    const coords = this.computeMenuCoords(ctx.range);
    if (coords === 'hidden') {
      this.closeMentionMenu();
      return;
    }
    if (coords) this.mentionMenuCoords.set(coords);
    this.showMentionMenu.set(true);
    this.searchAddAndTag(ctx.query);
  }

  private searchAddAndTag(query: string): void {
    this.mentionSearchSub?.unsubscribe();
    this.mentionSearchSub = null;
    const search = this.mentionSearch();
    if (!this.allowAddAndTag() || !search || !query) {
      this.addAndTagResults.set([]);
      return;
    }
    this.mentionSearchSub = search(query).subscribe({
      next: (results) => {
        const participantIds = new Set((this.mentionCandidates() ?? []).map((p) => p.id));
        this.addAndTagResults.set(results.filter((p) => !participantIds.has(p.id)));
      },
      error: () => this.addAndTagResults.set([])
    });
  }

  private handleMentionMenuKey(event: KeyboardEvent): boolean {
    const items = this.mentionMenuItems();
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.closeMentionMenu();
      return true;
    }
    if (items.length === 0) return false;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      this.mentionSelectedIndex.update((idx) => (idx + step + items.length) % items.length);
      return true;
    }
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      const selected = items[this.mentionSelectedIndex()] ?? items[0];
      if (selected.addAndTag) this.pickAddAndTag(selected.person);
      else this.pickMention(selected.person);
      return true;
    }
    return false;
  }

  closeMentionMenu(): void {
    this.showMentionMenu.set(false);
    this.mentionQuery.set('');
    this.mentionSelectedIndex.set(0);
    this.addAndTagResults.set([]);
    this.mentionSearchSub?.unsubscribe();
    this.mentionSearchSub = null;
  }

  pickMention(person: MentionCandidate): void {
    this.insertMention(person);
  }

  /** Hands a non-participant to the host; the "@query" stays put until the host calls insertMention. */
  pickAddAndTag(person: MentionCandidate): void {
    this.closeMentionMenu();
    this.addAndTag.emit(person);
  }

  /** Replaces the pending "@query" with a mention chip for `person`. */
  insertMention(person: MentionCandidate): void {
    const ctx = this.pendingMention;
    const el = this.contentEditor()?.nativeElement;
    this.pendingMention = null;
    this.closeMentionMenu();
    if (!ctx || !el || !el.contains(ctx.textNode)) return;

    const text = ctx.textNode.textContent ?? '';
    const before = text.slice(0, ctx.atOffset);
    const after = text.slice(ctx.atOffset + 1 + ctx.query.length);
    ctx.textNode.textContent = before;

    const chip = document.createElement('span');
    chip.className = 'mention';
    chip.setAttribute('data-employee-id', person.id);
    chip.setAttribute('contenteditable', 'false');
    chip.textContent = `@${person.name}`;
    const trailing = document.createTextNode(`\u00A0${after}`);
    const parent = ctx.textNode.parentNode!;
    parent.insertBefore(trailing, ctx.textNode.nextSibling);
    parent.insertBefore(chip, trailing);

    const caret = document.createRange();
    caret.setStart(trailing, 1);
    caret.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(caret);
    el.focus();
    this.onEditorInput();
  }

  private emitMentionsIfChanged(el: HTMLElement): void {
    const ids = [...new Set(
      Array.from(el.querySelectorAll('span.mention[data-employee-id]')).map((node) => node.getAttribute('data-employee-id')!)
    )];
    if (ids.length === this.lastMentionIds.length && ids.every((id, i) => id === this.lastMentionIds[i])) return;
    this.lastMentionIds = ids;
    this.mentionsChange.emit(ids);
  }

  scrollActiveSlashItemIntoView(): void {
    setTimeout(() => {
      const activeEl = this.host.nativeElement.querySelector('.tfm-slash-item--active') as HTMLElement | null;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });
  }

  executeSlashCommand(cmdId: string): void {
    this.removeSlashToken();
    this.closeSlashMenu();

    const el = this.contentEditor()?.nativeElement;
    if (el) el.focus();

    if (this.hostSlashCommandIds().has(cmdId)) {
      this.onEditorInput();
      this.slashCommand.emit(cmdId);
      return;
    }

    switch (cmdId) {
      case 'bold':
        this.formatDoc('bold');
        break;
      case 'italic':
        this.formatDoc('italic');
        break;
      case 'underline':
        this.formatDoc('underline');
        break;
      case 'highlight':
        this.applyHighlight('#fff3bf');
        break;
      case 'h1':
        this.toggleHeading('h1');
        break;
      case 'h2':
        this.toggleHeading('h2');
        break;
      case 'p':
        this.formatNormalText();
        break;
      case 'bullet':
        this.formatList('unordered');
        break;
      case 'numbered':
        this.formatList('ordered');
        break;
      case 'checklist':
        this.toggleChecklist();
        break;
      case 'code':
        this.toggleCode();
        break;
      case 'divider':
        this.formatDoc('insertHorizontalRule');
        break;
      case 'image':
        this.imageFileInput()?.nativeElement.click();
        break;
      case 'link':
        this.toggleLinkPopoverDirect();
        break;
      case 'attach':
        this.attachmentFileInput()?.nativeElement.click();
        break;
    }
    this.onEditorInput();
  }
}
