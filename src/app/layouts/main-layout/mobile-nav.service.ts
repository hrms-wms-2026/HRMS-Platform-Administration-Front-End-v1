import { Injectable, signal } from '@angular/core';

const DESKTOP_QUERY = '(min-width: 1024px)';

@Injectable({ providedIn: 'root' })
export class MobileNavService {
  private readonly mediaQuery =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(DESKTOP_QUERY)
      : null;

  readonly isDesktop = signal(this.mediaQuery?.matches ?? true);
  readonly open = signal(false);

  constructor() {
    this.mediaQuery?.addEventListener('change', (event) => {
      this.isDesktop.set(event.matches);
      if (event.matches) {
        this.open.set(false);
      }
    });
  }

  toggle(): void {
    this.open.update((value) => !value);
  }

  close(): void {
    this.open.set(false);
  }
}
