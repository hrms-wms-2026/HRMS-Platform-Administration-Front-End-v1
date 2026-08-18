import { Component, ElementRef, ViewChild, effect, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

/** Toolbar action wired to document.execCommand - deprecated but still the only
 * dependency-free way to drive a contenteditable region's rich text formatting;
 * every current browser still implements the exact commands used here. */
interface ToolbarButton {
  command: string;
  label: string;
  icon: string;
}

const TOOLBAR_BUTTONS: ToolbarButton[] = [
  { command: 'bold', label: 'Bold', icon: 'B' },
  { command: 'italic', label: 'Italic', icon: 'I' },
  { command: 'underline', label: 'Underline', icon: 'U' },
];

// A small curated set rather than a full emoji library - keeps the picker a lightweight
// dependency-free panel instead of pulling in an emoji-data package for a single toolbar button.
const EMOJIS: readonly string[] = [
  '😀', '😊', '🙂', '😉', '😍', '🎉', '👍', '👏',
  '🙏', '💡', '📢', '🚀', '🔥', '✅', '❌', '⚠️',
  '❗', '❓', '📌', '📅', '🔧', '📈', '📉', '💬',
];

type ActivePanel = 'link' | 'image' | 'emoji' | null;

@Component({
  selector: 'app-rich-text-editor',
  imports: [FormsModule],
  templateUrl: './rich-text-editor.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RichTextEditor),
      multi: true,
    },
  ],
})
export class RichTextEditor implements ControlValueAccessor {
  @ViewChild('editable', { static: true }) private readonly editableRef!: ElementRef<HTMLDivElement>;
  @ViewChild('promptInput') private readonly promptInputRef?: ElementRef<HTMLInputElement>;

  protected readonly toolbarButtons = TOOLBAR_BUTTONS;
  protected readonly emojis = EMOJIS;
  protected readonly disabled = signal(false);
  protected readonly activePanel = signal<ActivePanel>(null);
  protected readonly promptValue = signal('');

  // window.prompt() is a blocking native dialog that many embedding contexts (sandboxed
  // iframes without allow-modals, some PWA/webview shells) refuse to show at all, so Link/Image
  // use this inline input instead. Opening it moves focus out of the contenteditable region,
  // which collapses its selection - the Range is captured here and restored just before the
  // command runs so createLink/insertImage still apply at the right spot. The emoji panel never
  // needs this: every clickable in it prevents mousedown's default focus shift, so the
  // contenteditable region (and its caret) never actually loses focus in the first place.
  private savedRange: Range | null = null;

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    effect(() => {
      if (this.activePanel() === 'link' || this.activePanel() === 'image') {
        queueMicrotask(() => this.promptInputRef?.nativeElement.focus());
      }
    });
  }

  writeValue(value: string | null): void {
    const html = value ?? '';
    if (this.editableRef.nativeElement.innerHTML !== html) {
      this.editableRef.nativeElement.innerHTML = html;
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected runCommand(command: string, value?: string): void {
    this.editableRef.nativeElement.focus();
    document.execCommand(command, false, value);
    this.emitChange();
  }

  protected insertLink(): void {
    this.openPrompt('link');
  }

  protected insertImage(): void {
    this.openPrompt('image');
  }

  protected toggleEmojiPicker(): void {
    this.activePanel.set(this.activePanel() === 'emoji' ? null : 'emoji');
  }

  protected insertEmoji(emoji: string): void {
    this.runCommand('insertText', emoji);
    this.activePanel.set(null);
  }

  protected confirmPrompt(): void {
    const kind = this.activePanel();
    const url = this.promptValue().trim();
    if ((kind !== 'link' && kind !== 'image') || !url) {
      this.closePrompt();
      return;
    }

    this.editableRef.nativeElement.focus();
    const selection = window.getSelection();
    if (this.savedRange && selection) {
      selection.removeAllRanges();
      selection.addRange(this.savedRange);
    }

    document.execCommand(kind === 'link' ? 'createLink' : 'insertImage', false, url);
    this.emitChange();
    this.closePrompt();
  }

  protected cancelPrompt(): void {
    this.closePrompt();
  }

  protected onInput(): void {
    this.emitChange();
  }

  protected onBlur(): void {
    // Clicking a list/bold/etc. toolbar button on empty content leaves an empty
    // <ul><li><br></li></ul> (or similar) behind - textContent is empty so the form already
    // treats this as blank, but the leftover markup still renders a visible bullet/marker with
    // nothing typed into it. Clear it on blur so the box actually looks as empty as it is.
    if (this.isEmpty()) {
      this.editableRef.nativeElement.innerHTML = '';
    }
    this.onTouched();
  }

  private openPrompt(kind: 'link' | 'image'): void {
    const selection = window.getSelection();
    this.savedRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
    this.promptValue.set('');
    this.activePanel.set(kind);
  }

  private closePrompt(): void {
    this.activePanel.set(null);
    this.promptValue.set('');
    this.savedRange = null;
  }

  private isEmpty(): boolean {
    return this.editableRef.nativeElement.textContent?.trim().length === 0;
  }

  private emitChange(): void {
    const element = this.editableRef.nativeElement;
    // An "emptied" contenteditable div is left holding a stray <br> by some browsers -
    // normalize that back to '' so required-field validation sees it as empty.
    this.onChange(this.isEmpty() ? '' : element.innerHTML);
  }
}
