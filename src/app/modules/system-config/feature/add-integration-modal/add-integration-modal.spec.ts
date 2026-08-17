import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AddIntegrationModal } from './add-integration-modal';
import { IntegrationCatalogService } from '../../data/integration-catalog.service';
import { OAuthAppsService } from '../../data/oauth-apps.service';

describe('AddIntegrationModal', () => {
  let integrationCatalogService: { create: jest.Mock };
  let oauthAppsService: { list: jest.Mock };

  beforeEach(async () => {
    integrationCatalogService = { create: jest.fn().mockReturnValue(of(undefined)) };
    oauthAppsService = {
      list: jest.fn().mockReturnValue(
        of([
          {
            provider: 'github',
            displayName: 'GitHub',
            configured: true,
            isActive: true,
          },
        ]),
      ),
    };

    await TestBed.configureTestingModule({
      imports: [AddIntegrationModal],
      providers: [
        { provide: IntegrationCatalogService, useValue: integrationCatalogService },
        { provide: OAuthAppsService, useValue: oauthAppsService },
      ],
    }).compileComponents();
  });

  function setup() {
    const fixture = TestBed.createComponent(AddIntegrationModal);
    fixture.detectChanges();
    return fixture;
  }

  it('loads oauth providers and preselects the first provider', () => {
    const fixture = setup();
    expect(oauthAppsService.list).toHaveBeenCalled();
    expect(fixture.componentInstance['form'].controls.onevoAppProvider.value).toBe('github');
  });

  it('creates an integration and emits created', () => {
    const fixture = setup();
    let created = false;
    fixture.componentInstance.created.subscribe(() => (created = true));

    fixture.componentInstance['form'].patchValue({
      integrationKey: 'github_work',
      displayName: 'GitHub Work',
      description: 'GitHub for work management',
      connectionScope: 'tenant',
      onevoAppProvider: 'github',
      isActive: true,
    });
    fixture.componentInstance['submit']();

    expect(integrationCatalogService.create).toHaveBeenCalledWith({
      integrationKey: 'github_work',
      displayName: 'GitHub Work',
      description: 'GitHub for work management',
      connectionScope: 'tenant',
      onevoAppProvider: 'github',
      logoUrl: undefined,
      isActive: true,
    });
    expect(created).toBe(true);
  });

  it('shows backend error detail on create failure', () => {
    integrationCatalogService.create.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { detail: 'Integration key already exists.' } })),
    );
    const fixture = setup();

    fixture.componentInstance['form'].patchValue({
      integrationKey: 'github',
      displayName: 'GitHub',
      onevoAppProvider: 'github',
    });
    fixture.componentInstance['submit']();

    expect(fixture.componentInstance['errorMessage']()).toBe('Integration key already exists.');
  });

  it('emits closed when cancelled', () => {
    const fixture = setup();
    let closed = false;
    fixture.componentInstance.closed.subscribe(() => (closed = true));

    fixture.componentInstance['cancel']();

    expect(closed).toBe(true);
  });
});
