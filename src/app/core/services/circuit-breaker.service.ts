import { Injectable, signal } from '@angular/core';

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

const FAILURE_THRESHOLD = 5;
const OPEN_DURATION_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class CircuitBreakerService {
  private readonly _state = signal<CircuitState>('CLOSED');
  private consecutiveFailures = 0;
  private openedAt: number | null = null;

  readonly state = this._state.asReadonly();

  canRequest(): boolean {
    if (this._state() === 'OPEN') {
      const elapsed = Date.now() - (this.openedAt ?? 0);
      if (elapsed >= OPEN_DURATION_MS) {
        this._state.set('HALF_OPEN');
        return true;
      }
      return false;
    }
    return true;
  }

  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this._state.set('CLOSED');
  }

  recordFailure(): void {
    this.consecutiveFailures++;

    if (this._state() === 'HALF_OPEN' || this.consecutiveFailures >= FAILURE_THRESHOLD) {
      this._state.set('OPEN');
      this.openedAt = Date.now();
    }
  }
}