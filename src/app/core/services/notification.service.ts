import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly _notifications = signal<Notification[]>([]);
  readonly notifications = this._notifications.asReadonly();

  show(type: NotificationType, message: string): void {
    const notification: Notification = { id: crypto.randomUUID(), type, message };
    this._notifications.update((list) => [...list, notification]);
    setTimeout(() => this.dismiss(notification.id), 5000);
  }

  success(message: string): void {
    this.show('success', message);
  }

  error(message: string): void {
    this.show('error', message);
  }

  warning(message: string): void {
    this.show('warning', message);
  }

  info(message: string): void {
    this.show('info', message);
  }

  dismiss(id: string): void {
    this._notifications.update((list) => list.filter((n) => n.id !== id));
  }
}