import {
  Component,
  ElementRef,
  HostListener,
  computed,
  forwardRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SearchableSelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-searchable-select',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableSelect),
      multi: true,
    },
  ],
  templateUrl: './searchable-select.html',
})
export class SearchableSelect implements ControlValueAccessor {
  private readonly elementRef = inject(ElementRef);

  readonly options = input.required<readonly SearchableSelectOption[]>();
  readonly pinnedOptions = input<readonly SearchableSelectOption[]>([]);
  readonly placeholder = input('Type to search…');
  readonly emptyMessage = input('No matches found.');
  readonly invalid = input(false);
  readonly disabled = input(false);

  protected readonly open = signal(false);
  protected readonly query = signal('');
  protected readonly value = signal('');
  protected readonly isDisabled = signal(false);

  protected readonly selectedOption = computed(() =>
    this.options().find((option) => option.value === this.value()),
  );

  protected readonly visibleOptions = computed(() => {
    const search = this.query().trim().toLowerCase();
    if (!search) {
      return this.pinnedOptions().length > 0 ? this.pinnedOptions() : this.options();
    }
    return this.options().filter(
      (option) =>
        option.label.toLowerCase().includes(search) || option.value.toLowerCase().includes(search),
    );
  });

  protected readonly inputDisplay = computed(() => {
    if (this.open()) {
      return this.query();
    }
    return this.selectedOption()?.label ?? this.query();
  });

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
    this.query.set('');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  protected onInputFocus(): void {
    if (this.isDisabled() || this.disabled()) {
      return;
    }
    this.open.set(true);
    this.query.set('');
    this.onTouched();
  }

  protected onInput(value: string): void {
    this.query.set(value);
    this.open.set(true);
    if (!value.trim()) {
      this.value.set('');
      this.onChange('');
    }
  }

  protected selectOption(option: SearchableSelectOption): void {
    this.value.set(option.value);
    this.query.set('');
    this.open.set(false);
    this.onChange(option.value);
    this.onTouched();
  }

  protected onInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      const first = this.visibleOptions()[0];
      if (first) {
        this.selectOption(first);
      }
      return;
    }
    if (event.key === 'Escape') {
      this.open.set(false);
      this.query.set('');
    }
  }

  protected clearSelection(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.value.set('');
    this.query.set('');
    this.open.set(true);
    this.onChange('');
    this.onTouched();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.open.set(false);
      this.query.set('');
    }
  }
}
