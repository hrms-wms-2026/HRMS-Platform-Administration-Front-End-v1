import { TestBed } from '@angular/core/testing';
import { ToastContainer } from './toast-container';
import { NotificationService } from '../../../core/services/notification.service';

describe('ToastContainer', () => {
  let notificationService: NotificationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToastContainer],
    }).compileComponents();

    notificationService = TestBed.inject(NotificationService);
  });

  it('renders no toasts when there are none', () => {
    const fixture = TestBed.createComponent(ToastContainer);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });

  it('renders a notification message when the service emits one', () => {
    const fixture = TestBed.createComponent(ToastContainer);
    fixture.detectChanges();

    notificationService.info('Invite flow is coming soon.');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Invite flow is coming soon.');
  });

  it('removes a toast from the DOM when dismissed', () => {
    const fixture = TestBed.createComponent(ToastContainer);
    fixture.detectChanges();

    notificationService.info('Dismiss me');
    fixture.detectChanges();
    const [notification] = notificationService.notifications();
    notificationService.dismiss(notification.id);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Dismiss me');
  });
});
