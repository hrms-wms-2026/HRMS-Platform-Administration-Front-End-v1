import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ModuleCatalogService } from '../../../module-catalog/data/module-catalog.service';
import { ModuleCatalogItem } from '../../../module-catalog/data/module-catalog.model';
import {
  ConfigurationTemplate,
  CreateConfigurationTemplateRequest,
  TEMPLATE_TYPES,
} from '../../data/configuration-template.model';
import { Button } from '../../../../shared/ui/button/button';
import { CheckboxGridSkeleton } from '../../../../shared/ui/checkbox-grid-skeleton/checkbox-grid-skeleton';

const KEY_PATTERN = /^[a-z0-9_]+$/;

function jsonPayloadValidator(control: AbstractControl): ValidationErrors | null {
  if (typeof control.value !== 'string' || control.value.trim() === '') {
    return null; // emptiness is handled by Validators.required
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(control.value);
  } catch {
    return { jsonParse: true };
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { jsonObject: true };
  }
  return null;
}

@Component({
  selector: 'app-configuration-template-form',
  imports: [ReactiveFormsModule, Button, CheckboxGridSkeleton],
  templateUrl: './configuration-template-form.html',
})
export class ConfigurationTemplateForm implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly moduleCatalogService = inject(ModuleCatalogService);

  readonly mode = input.required<'create' | 'edit'>();
  readonly initialValue = input<ConfigurationTemplate | null>(null);
  readonly saving = input(false);
  readonly submitted = output<CreateConfigurationTemplateRequest>();

  protected readonly templateTypeOptions = TEMPLATE_TYPES;

  protected readonly loadingModules = signal(false);
  protected readonly modulesError = signal<string | null>(null);
  protected readonly modules = signal<ModuleCatalogItem[]>([]);
  protected readonly selectedModuleKeys = signal<Set<string>>(new Set());

  protected readonly isCreate = computed(() => this.mode() === 'create');

  protected readonly form = this.formBuilder.nonNullable.group({
    templateKey: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(KEY_PATTERN)]],
    templateType: ['', Validators.required],
    name: ['', [Validators.required, Validators.maxLength(150)]],
    description: ['', Validators.maxLength(500)],
    industryProfileTag: ['', Validators.maxLength(100)],
    payloadJson: ['', [Validators.required, jsonPayloadValidator]],
  });

  // Reading form.valueChanges only to establish a signal dependency - form.getRawValue()
  // itself is a plain (non-signal) snapshot read, always accurate at call time, but
  // reading it alone inside computed() would never trigger recomputation on keystrokes.
  private readonly formValueTick = toSignal(this.form.valueChanges, { initialValue: null });

  protected readonly hasChanges = computed(() => {
    this.formValueTick();
    this.selectedModuleKeys();

    if (this.isCreate()) {
      return true;
    }
    const initial = this.initialValue();
    if (!initial) {
      return true;
    }

    const raw = this.form.getRawValue();
    const fieldsChanged =
      raw.templateKey !== initial.templateKey ||
      raw.templateType !== initial.templateType ||
      raw.name !== initial.name ||
      (raw.description ?? '') !== (initial.description ?? '') ||
      (raw.industryProfileTag ?? '') !== (initial.industryProfileTag ?? '') ||
      raw.payloadJson.trim() !== JSON.stringify(initial.payloadJson, null, 2);
    if (fieldsChanged) {
      return true;
    }

    const currentModules = this.selectedModuleKeys();
    const initialModules = new Set(initial.moduleKeys);
    if (currentModules.size !== initialModules.size) {
      return true;
    }
    for (const key of currentModules) {
      if (!initialModules.has(key)) {
        return true;
      }
    }
    return false;
  });

  protected readonly canSubmit = computed(() => {
    // Read every signal unconditionally before combining with && - short-circuiting on
    // form.valid (a plain getter, not a signal) would otherwise skip reading
    // selectedModuleKeys()/saving()/hasChanges() on that pass, so Angular never tracks
    // them as dependencies and this computed gets stuck stale forever.
    const notSaving = !this.saving();
    const changed = this.hasChanges();
    return this.form.valid && notSaving && changed;
  });

  ngOnInit(): void {
    this.loadModules();

    const value = this.initialValue();
    if (value) {
      this.form.patchValue({
        templateKey: value.templateKey,
        templateType: value.templateType,
        name: value.name,
        description: value.description ?? '',
        industryProfileTag: value.industryProfileTag ?? '',
        payloadJson: JSON.stringify(value.payloadJson, null, 2),
      });
      this.selectedModuleKeys.set(new Set(value.moduleKeys));
    }

    if (this.mode() === 'edit') {
      this.form.controls.templateKey.disable();
      this.form.controls.templateType.disable();
    }
  }

  private loadModules(): void {
    this.loadingModules.set(true);

    this.moduleCatalogService.list().subscribe({
      next: (modules) => {
        this.modules.set(modules.filter((m) => m.isActive));
        this.loadingModules.set(false);
      },
      error: () => {
        this.modulesError.set('Could not load the module catalog.');
        this.loadingModules.set(false);
      },
    });
  }

  protected toggleModule(moduleKey: string): void {
    const next = new Set(this.selectedModuleKeys());
    if (next.has(moduleKey)) {
      next.delete(moduleKey);
    } else {
      next.add(moduleKey);
    }
    this.selectedModuleKeys.set(next);
  }

  protected submit(): void {
    if (!this.canSubmit()) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.submitted.emit({
      templateKey: raw.templateKey.trim().toLowerCase(),
      templateType: raw.templateType,
      name: raw.name.trim(),
      description: raw.description.trim() || null,
      moduleKeys: Array.from(this.selectedModuleKeys()),
      industryProfileTag: raw.industryProfileTag.trim() || null,
      payloadJson: JSON.parse(raw.payloadJson) as Record<string, unknown>,
      isSystem: false,
    });
  }
}
