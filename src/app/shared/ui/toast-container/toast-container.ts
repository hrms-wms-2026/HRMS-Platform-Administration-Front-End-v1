import { Component, inject } from '@angular/core';
import { NotificationService, NotificationType } from '../../../core/services/notification.service';

const TONE_CLASSES: Record<NotificationType, string> = {
  success: 'border-green-200 bg-green-50 text-green-700',
  error: 'border-red-200 bg-red-50 text-red-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  info: 'border-blue-200 bg-blue-50 text-blue-700',
};

@Component({
  selector: 'app-toast-container',
  template: `
    <div class="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      @for (notification of notificationService.notifications(); track notification.id) {
        <div
          class="pointer-events-auto flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium shadow-md"
          [class]="toneClasses(notification.type)"
          role="status"
        >
          <span>{{ notification.message }}</span>
          <button
            type="button"
            class="text-xs font-semibold opacity-70 hover:opacity-100"
            (click)="notificationService.dismiss(notification.id)"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastContainer {
  protected readonly notificationService = inject(NotificationService);

  protected toneClasses(type: NotificationType): string {
    return TONE_CLASSES[type];
  }
}
