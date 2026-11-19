import { Component, ElementRef, HostListener, computed, inject, input, output, signal } from '@angular/core';

export interface DateRange {
  from: string;
  to: string;
}

interface CalendarDay {
  iso: string;
  dayNumber: number;
  inCurrentMonth: boolean;
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function toIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseIso(iso: string): Date | null {
  if (!iso) {
    return null;
  }
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day);
}

function formatDisplay(iso: string): string {
  const date = parseIso(iso);
  if (!date) {
    return '';
  }
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}/${day}/${date.getFullYear()}`;
}

function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const total = year * 12 + month + delta;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

function buildMonthGrid(year: number, month: number): CalendarDay[] {
  const firstOfMonth = new Date(year, month, 1);
  const gridStart = new Date(year, month, 1 - firstOfMonth.getDay());
  const days: CalendarDay[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    days.push({
      iso: toIso(date),
      dayNumber: date.getDate(),
      inCurrentMonth: date.getMonth() === month,
    });
  }
  return days;
}

@Component({
  selector: 'app-date-range-picker',
  host: { class: 'relative inline-block' },
  templateUrl: './date-range-picker.html',
})
export class DateRangePicker {
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  readonly from = input('');
  readonly to = input('');
  readonly placeholder = input('Any date');
  readonly rangeChange = output<DateRange>();

  protected readonly open = signal(false);
  protected readonly pendingFrom = signal<string | null>(null);
  protected readonly hoverIso = signal<string | null>(null);
  protected readonly viewYear = signal(new Date().getFullYear());
  protected readonly viewMonth = signal(new Date().getMonth());

  protected readonly dayLabels = DAY_LABELS;

  protected readonly displayLabel = computed(() => {
    const from = this.from();
    const to = this.to();
    if (!from && !to) {
      return this.placeholder();
    }
    return `${formatDisplay(from) || '…'} – ${formatDisplay(to) || '…'}`;
  });

  protected readonly hasValue = computed(() => !!this.from() || !!this.to());

  protected readonly leftMonthLabel = computed(() => `${MONTH_LABELS[this.viewMonth()]} ${this.viewYear()}`);
  protected readonly rightMonthLabel = computed(() => {
    const { year, month } = addMonths(this.viewYear(), this.viewMonth(), 1);
    return `${MONTH_LABELS[month]} ${year}`;
  });

  protected readonly leftMonthDays = computed(() => buildMonthGrid(this.viewYear(), this.viewMonth()));
  protected readonly rightMonthDays = computed(() => {
    const { year, month } = addMonths(this.viewYear(), this.viewMonth(), 1);
    return buildMonthGrid(year, month);
  });

  protected toggle(): void {
    if (this.open()) {
      this.close();
      return;
    }
    const anchor = parseIso(this.from()) ?? new Date();
    this.viewYear.set(anchor.getFullYear());
    this.viewMonth.set(anchor.getMonth());
    this.pendingFrom.set(null);
    this.hoverIso.set(null);
    this.open.set(true);
  }

  protected close(): void {
    this.open.set(false);
    this.pendingFrom.set(null);
    this.hoverIso.set(null);
  }

  protected prevMonth(): void {
    const { year, month } = addMonths(this.viewYear(), this.viewMonth(), -1);
    this.viewYear.set(year);
    this.viewMonth.set(month);
  }

  protected nextMonth(): void {
    const { year, month } = addMonths(this.viewYear(), this.viewMonth(), 1);
    this.viewYear.set(year);
    this.viewMonth.set(month);
  }

  protected selectDay(iso: string): void {
    const pending = this.pendingFrom();
    if (!pending) {
      this.pendingFrom.set(iso);
      this.hoverIso.set(iso);
      return;
    }

    const range: DateRange = iso >= pending ? { from: pending, to: iso } : { from: iso, to: pending };
    this.rangeChange.emit(range);
    this.close();
  }

  protected onDayHover(iso: string): void {
    if (this.pendingFrom()) {
      this.hoverIso.set(iso);
    }
  }

  protected dayButtonClasses(iso: string, inCurrentMonth: boolean): string {
    const base = 'mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm transition';
    if (!inCurrentMonth) {
      return `${base} text-slate-300 dark:text-slate-600`;
    }
    const state = this.dayState(iso);
    if (state === 'endpoint') {
      return `${base} bg-indigo-600 text-white`;
    }
    if (state === 'in-range') {
      return `${base} bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300`;
    }
    return `${base} text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800`;
  }

  protected dayState(iso: string): 'endpoint' | 'in-range' | 'none' {
    const pending = this.pendingFrom();

    if (pending) {
      const hover = this.hoverIso() ?? pending;
      const start = pending <= hover ? pending : hover;
      const end = pending <= hover ? hover : pending;
      if (iso === pending) {
        return 'endpoint';
      }
      return iso >= start && iso <= end ? 'in-range' : 'none';
    }

    const committedFrom = this.from();
    const committedTo = this.to();
    if (committedFrom && iso === committedFrom) {
      return 'endpoint';
    }
    if (committedTo && iso === committedTo) {
      return 'endpoint';
    }
    if (committedFrom && committedTo && iso > committedFrom && iso < committedTo) {
      return 'in-range';
    }
    return 'none';
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.open()) {
      return;
    }
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.open()) {
      this.close();
    }
  }
}
