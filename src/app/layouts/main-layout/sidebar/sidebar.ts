import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  host: { class: 'block h-full min-h-0 shrink-0' },
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
})
export class Sidebar {}