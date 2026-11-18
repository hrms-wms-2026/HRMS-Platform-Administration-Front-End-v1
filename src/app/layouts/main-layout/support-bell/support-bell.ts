import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { switchMap, timer } from 'rxjs';
import { SupportTicketsService } from '../../../modules/support/data/support-tickets.service';
import {
  SUPPORT_ASSIGNEE_UNASSIGNED,
  SupportSummary,
} from '../../../modules/support/data/support-ticket.model';

/** How often the bell refreshes its counts while the console is open. */
export const SUPPORT_BELL_REFRESH_MS = 60_000;

/**
 * The top-bar bell for platform support staff: shows how many tickets wait on the support team
 * (GET admin/v1/support/summary) and links to the matching filtered ticket lists. Rendered only for
 * users with platform.support.read. It stops polling for good after a 401/403, so a revoked
 * permission or an ended session never turns into an error toast every minute.
 */
@Component({
  selector: 'app-support-bell',
  imports: [RouterLink],
  templateUrl: './support-bell.html',
})
export class SupportBell implements OnInit {
  private readonly ticketsService = inject(SupportTicketsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly unassigned = SUPPORT_ASSIGNEE_UNASSIGNED;
  protected readonly summary = signal<SupportSummary | null>(null);
  protected readonly open = signal(false);
  protected readonly count = computed(() => this.summary()?.awaitingSupport ?? 0);
  protected readonly countLabel = computed(() =>
    this.count() > 99 ? '99+' : String(this.count()),
  );

  ngOnInit(): void {
    this.start(0);
  }

  protected toggle(): void {
    this.open.update((value) => !value);
  }

  protected close(): void {
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.open.set(false);
  }

  /** Polls the summary. An error ends the stream; transient failures restart it after one interval. */
  private start(initialDelayMs: number): void {
    timer(initialDelayMs, SUPPORT_BELL_REFRESH_MS)
      .pipe(
        switchMap(() => this.ticketsService.getSummary()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (summary) => this.summary.set(summary),
        error: (error: unknown) => {
          if (
            error instanceof HttpErrorResponse &&
            (error.status === 401 || error.status === 403)
          ) {
            this.summary.set(null);
            return;
          }
          this.start(SUPPORT_BELL_REFRESH_MS);
        },
      });
  }
}
