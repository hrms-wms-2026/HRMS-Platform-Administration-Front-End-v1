import { Component, OnInit, computed, effect, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ModuleCatalogService } from '../../../module-catalog/data/module-catalog.service';
import { ModuleCatalogItem, ModulePermissionItem } from '../../../module-catalog/data/module-catalog.model';
import {
  CreateRoleTemplatePayload,
  RoleTemplate,
  UpdateRoleTemplatePayload,
} from '../../data/role-template.model';
import { Button } from '../../../../shared/ui/button/button';
import { CheckboxGridSkeleton } from '../../../../shared/ui/checkbox-grid-skeleton/checkbox-grid-skeleton';

interface PermissionGroup {
  moduleKey: string;
  permissions: ModulePermissionItem[];
}

@Component({
  selector: 'app-role-template-form',
  imports: [ReactiveFormsModule, Button, CheckboxGridSkeleton],
  templateUrl: './role-template-form.html',
})
export class RoleTemplateForm implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly moduleCatalogService = inject(ModuleCatalogService);

  readonly mode = input.required<'create' | 'edit'>();
  readonly initialValue = input<RoleTemplate | null>(null);
  readonly readOnly = input(false);
  readonly saving = input(false);
  readonly submitted = output<CreateRoleTemplatePayload | UpdateRoleTemplatePayload>();

  protected readonly loadingModules = signal(false);
  protected readonly loadingPermissions = signal(false);
  protected readonly modulesError = signal<string | null>(null);
  protected readonly permissionsError = signal<string | null>(null);
  protected readonly modules = signal<ModuleCatalogItem[]>([]);
  protected readonly selectedModuleKeys = signal<Set<string>>(new Set());
  protected readonly selectedPermissionCodes = signal<Set<string>>(new Set());
  protected readonly permissionsByModule = signal<Map<string, ModulePermissionItem[]>>(new Map());

  protected readonly isCreate = computed(() => this.mode() === 'create');

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', Validators.maxLength(255)],
    isActive: [true],
  });

  private readonly formValueTick = toSignal(this.form.valueChanges, { initialValue: null });

  protected readonly permissionGroups = computed<PermissionGroup[]>(() => {
    const keys = Array.from(this.selectedModuleKeys()).sort();
    const byModule = this.permissionsByModule();
    return keys
      .map((moduleKey) => ({
        moduleKey,
        permissions: byModule.get(moduleKey) ?? [],
      }))
      .filter((group) => group.permissions.length > 0);
  });

  protected readonly hasChanges = computed(() => {
    this.formValueTick();
    this.selectedModuleKeys();
    this.selectedPermissionCodes();

    if (this.isCreate()) {
      return true;
    }

    const initial = this.initialValue();
    if (!initial) {
      return true;
    }

    const raw = this.form.getRawValue();
    if (raw.name !== initial.name) {
      return true;
    }
    if ((raw.description || '') !== (initial.description || '')) {
      return true;
    }
    if (raw.isActive !== initial.isActive) {
      return true;
    }

    return !this.setsEqual(this.selectedModuleKeys(), new Set(initial.moduleKeys))
      || !this.setsEqual(this.selectedPermissionCodes(), new Set(initial.permissionCodes));
  });

  protected readonly canSubmit = computed(() => {
    const hasModules = this.selectedModuleKeys().size > 0;
    const hasPermissions = this.selectedPermissionCodes().size > 0;
    const notSaving = !this.saving();
    const changed = this.hasChanges();
    const notLoading = !this.loadingPermissions();
    return this.form.valid && hasModules && hasPermissions && notSaving && changed && notLoading;
  });

  constructor() {
    effect(() => {
      const keys = Array.from(this.selectedModuleKeys()).sort();
      this.loadPermissionsForModules(keys);
    });
  }

  ngOnInit(): void {
    this.loadModules();

    const value = this.initialValue();
    if (value) {
      this.form.patchValue({
        name: value.name,
        description: value.description ?? '',
        isActive: value.isActive,
      });
      this.selectedModuleKeys.set(new Set(value.moduleKeys));
      this.selectedPermissionCodes.set(new Set(value.permissionCodes));
    }

    if (this.readOnly()) {
      this.form.disable();
    }
  }

  protected toggleModule(moduleKey: string): void {
    if (this.readOnly()) {
      return;
    }

    const nextModules = new Set(this.selectedModuleKeys());
    const nextPermissions = new Set(this.selectedPermissionCodes());

    if (nextModules.has(moduleKey)) {
      nextModules.delete(moduleKey);
      const removedCodes = new Set(
        (this.permissionsByModule().get(moduleKey) ?? []).map((item) => item.permissionCode),
      );
      for (const code of nextPermissions) {
        if (removedCodes.has(code)) {
          nextPermissions.delete(code);
        }
      }
    } else {
      nextModules.add(moduleKey);
    }

    this.selectedModuleKeys.set(nextModules);
    this.selectedPermissionCodes.set(nextPermissions);
  }

  protected togglePermission(code: string): void {
    if (this.readOnly()) {
      return;
    }

    const next = new Set(this.selectedPermissionCodes());
    if (next.has(code)) {
      next.delete(code);
    } else {
      next.add(code);
    }
    this.selectedPermissionCodes.set(next);
  }

  protected submit(): void {
    if (!this.canSubmit()) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload = {
      name: raw.name.trim(),
      description: raw.description.trim() || undefined,
      moduleKeys: Array.from(this.selectedModuleKeys()),
      permissionCodes: Array.from(this.selectedPermissionCodes()),
    };

    if (this.isCreate()) {
      this.submitted.emit(payload);
      return;
    }

    this.submitted.emit({
      ...payload,
      isActive: raw.isActive,
    });
  }

  private loadModules(): void {
    this.loadingModules.set(true);
    this.modulesError.set(null);

    this.moduleCatalogService.list().subscribe({
      next: (modules) => {
        this.modules.set(modules.filter((module) => module.isActive));
        this.loadingModules.set(false);
      },
      error: () => {
        this.modulesError.set('Could not load the module catalog.');
        this.loadingModules.set(false);
      },
    });
  }

  private loadPermissionsForModules(moduleKeys: string[]): void {
    if (moduleKeys.length === 0) {
      this.permissionsByModule.set(new Map());
      return;
    }

    this.loadingPermissions.set(true);
    this.permissionsError.set(null);

    forkJoin(
      moduleKeys.map((moduleKey) =>
        this.moduleCatalogService.listPermissions(moduleKey).pipe(
          catchError(() => of([] as ModulePermissionItem[])),
        ),
      ),
    ).subscribe({
      next: (results) => {
        const map = new Map<string, ModulePermissionItem[]>();
        moduleKeys.forEach((moduleKey, index) => {
          map.set(moduleKey, results[index] ?? []);
        });
        this.permissionsByModule.set(map);
        this.loadingPermissions.set(false);
      },
      error: () => {
        this.permissionsError.set('Could not load permissions for selected modules.');
        this.loadingPermissions.set(false);
      },
    });
  }

  private setsEqual(a: Set<string>, b: Set<string>): boolean {
    if (a.size !== b.size) {
      return false;
    }
    for (const value of a) {
      if (!b.has(value)) {
        return false;
      }
    }
    return true;
  }
}
