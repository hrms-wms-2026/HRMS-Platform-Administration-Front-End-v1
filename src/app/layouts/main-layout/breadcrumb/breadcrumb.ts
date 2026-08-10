import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';
import type { BreadcrumbData } from './breadcrumb.model';

@Component({
  selector: 'app-breadcrumb',
  imports: [RouterLink],
  templateUrl: './breadcrumb.html',
})
export class Breadcrumb {
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);

  protected readonly crumb = signal<BreadcrumbData | null>(this.readCrumb());

  constructor() {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.crumb.set(this.readCrumb());
    });
  }

  private readCrumb(): BreadcrumbData | null {
    let route = this.activatedRoute.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    return (route.snapshot.data['breadcrumb'] as BreadcrumbData | undefined) ?? null;
  }
}
