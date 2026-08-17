import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Button } from '../../../../shared/ui/button/button';

@Component({
  selector: 'app-access-denied',
  imports: [Button],
  templateUrl: './access-denied.html',
  styleUrl: './access-denied.css',
})
export class AccessDenied {
  private readonly router = inject(Router);

  goToDashboard(): void {
    this.router.navigateByUrl('/');
  }
}
