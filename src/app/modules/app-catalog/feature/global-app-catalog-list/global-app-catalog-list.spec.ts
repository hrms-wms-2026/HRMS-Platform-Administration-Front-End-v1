import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { GlobalAppCatalogList } from './global-app-catalog-list';
import { GlobalAppCatalogService } from '../../data/global-app-catalog.service';
import { GlobalApplication } from '../../data/global-application.model';
import { PermissionStore } from '../../../../core/permissions/permission.store';
import { NotificationService } from '../../../../core/services/notification.service';

describe('GlobalAppCatalogList editor drawer', () => {
  const app: GlobalApplication = {
    id: 'a1',
    appName: 'Zoom',
    processName: 'zoom.exe',
    category: 'meeting',
    isAllocated: true,
    publisher: 'Zoom Video Communications',
    isPublic: true,
    isProductiveDefault: false,
    hasLogo: false,
    firstSeenAt: '2026-10-01T00:00:00Z',
    lastSeenAt: '2026-10-20T00:00:00Z',
    updatedAt: null,
  };

  function setup() {
    TestBed.configureTestingModule({
      imports: [GlobalAppCatalogList],
      providers: [
        {
          provide: GlobalAppCatalogService,
          useValue: { list: jest.fn().mockReturnValue(of([app])), logoUrl: jest.fn().mockReturnValue('') },
        },
        { provide: NotificationService, useValue: { success: jest.fn(), error: jest.fn() } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(GlobalAppCatalogList);
    TestBed.inject(PermissionStore).setAuthorizationContext({
      userId: 'u1',
      email: 'admin@example.com',
      platformRole: 'Platform Super Admin',
      expiresAt: '',
      mfaRequired: false,
      permissions: ['platform.app_catalog.read', 'platform.app_catalog.manage'],
      scopes: {},
      entitlements: [],
    });
    fixture.detectChanges();
    return fixture;
  }

  const query = (fixture: ComponentFixture<GlobalAppCatalogList>, selector: string) =>
    fixture.nativeElement.querySelector(selector) as HTMLElement | null;

  function openEditor(fixture: ComponentFixture<GlobalAppCatalogList>) {
    const open = Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Open',
    )!;
    open.click();
    fixture.detectChanges();
    expect(query(fixture, '[role="dialog"]')).not.toBeNull();
  }

  it('closes when the backdrop is clicked', () => {
    const fixture = setup();
    openEditor(fixture);
    query(fixture, '[aria-label="Close editor"]')!.click();
    fixture.detectChanges();
    expect(query(fixture, '[role="dialog"]')).toBeNull();
  });

  it('closes from the keyboard with Enter on the backdrop', () => {
    const fixture = setup();
    openEditor(fixture);
    query(fixture, '[aria-label="Close editor"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();
    expect(query(fixture, '[role="dialog"]')).toBeNull();
  });

  it('closes on Escape', () => {
    const fixture = setup();
    openEditor(fixture);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(query(fixture, '[role="dialog"]')).toBeNull();
  });

  it('stays open when clicking inside the drawer', () => {
    const fixture = setup();
    openEditor(fixture);
    query(fixture, '[role="dialog"] h2')!.click();
    fixture.detectChanges();
    expect(query(fixture, '[role="dialog"]')).not.toBeNull();
  });
});
