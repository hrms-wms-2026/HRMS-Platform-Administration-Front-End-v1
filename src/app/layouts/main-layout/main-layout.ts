import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './navbar/navbar';
import { Sidebar } from './sidebar/sidebar';
import { ToastContainer } from '../../shared/ui/toast-container/toast-container';
import { SessionService } from '../../core/auth/session.service';
import { AnnouncementBanner } from './announcement-banner/announcement-banner';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, Navbar, Sidebar, ToastContainer, AnnouncementBanner],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
})
export class MainLayout {
  protected readonly announcementMessage = signal('');
  /** F-02: while MFA enrollment is pending, navigation is hidden; sign-out stays in the navbar. */
  protected readonly mfaEnrollmentRequired = inject(SessionService).mfaEnrollmentRequired;
}