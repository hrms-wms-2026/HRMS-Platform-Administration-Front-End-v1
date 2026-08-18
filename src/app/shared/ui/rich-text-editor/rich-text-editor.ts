import { Component, ElementRef, ViewChild, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/** Toolbar action wired to document.execCommand - deprecated but still the only
 * dependency-free way to drive a contenteditable region's rich text formatting;
 * every current browser still implements the exact commands used here. */
interface ToolbarButton {
  command: string;
  label: string;
  icon: string;
  value?: string;
}

const TOOLBAR_BUTTONS: ToolbarButton[] = [
  { command: 'bold', label: 'Bold', icon: 'B' },
  { command: 'italic', label: 'Italic', icon: 'I' },
  { command: 'underline', label: 'Underline', icon: 'U' },
  { command: 'insertUnorderedList', label: 'Bulleted list', icon: '• List' },
  { command: 'insertOrderedList', label: 'Numbered list', icon: '1. List' },
];

@Component({
  selector: 'app-rich-text-editor',
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

  protected readonly toolbarButtons = TOOLBAR_BUTTONS;
  protected readonly disabled = signal(false);

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

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
    const url = window.prompt('Link URL (https://...)');
    if (!url) {
      return;
    }
    this.runCommand('createLink', url);
  }

  protected insertImage(): void {
    const url = window.prompt('Image URL (https://...)');
    if (!url) {
      return;
    }
    this.runCommand('insertImage', url);
  }

  protected onInput(): void {
    this.emitChange();
  }

  protected onBlur(): void {
    this.onTouched();
  }

  private emitChange(): void {
    const element = this.editableRef.nativeElement;
    // An "emptied" contenteditable div is left holding a stray <br> by some browsers -
    // normalize that back to '' so required-field validation sees it as empty.
    const isEmpty = element.textContent?.trim().length === 0;
    this.onChange(isEmpty ? '' : element.innerHTML);
  }
}
