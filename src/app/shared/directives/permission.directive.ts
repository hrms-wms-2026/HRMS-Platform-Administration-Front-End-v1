import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';
import { PermissionStore } from '../../core/permissions/permission.store';

@Directive({
  selector: '[appPermission]',
})
export class PermissionDirective {
  private readonly templateRef = inject(TemplateRef);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly store = inject(PermissionStore);

  readonly appPermission = input.required<string>();

  private hasView = false;

  constructor() {
    effect(() => {
      const allowed = this.store.hasPermission(this.appPermission());

      if (allowed && !this.hasView) {
        this.viewContainerRef.createEmbeddedView(this.templateRef);
        this.hasView = true;
      } else if (!allowed && this.hasView) {
        this.viewContainerRef.clear();
        this.hasView = false;
      }
    });
  }
}