import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './navbar/navbar';
import { Sidebar } from './sidebar/sidebar';
import { ToastContainer } from '../../shared/ui/toast-container/toast-container';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, Navbar, Sidebar, ToastContainer],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
})
export class MainLayout {
  protected readonly announcementMessage = signal('');
}