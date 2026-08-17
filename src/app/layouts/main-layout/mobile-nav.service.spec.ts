import { TestBed } from '@angular/core/testing';
import { MobileNavService } from './mobile-nav.service';

describe('MobileNavService', () => {
  function setup() {
    TestBed.configureTestingModule({});
    return TestBed.inject(MobileNavService);
  }

  it('starts closed', () => {
    const service = setup();

    expect(service.open()).toBe(false);
  });

  it('toggles open state', () => {
    const service = setup();

    service.toggle();
    expect(service.open()).toBe(true);

    service.toggle();
    expect(service.open()).toBe(false);
  });

  it('close() sets open to false', () => {
    const service = setup();

    service.toggle();
    service.close();

    expect(service.open()).toBe(false);
  });

  it('defaults isDesktop to true when matchMedia is unavailable', () => {
    const service = setup();

    expect(service.isDesktop()).toBe(true);
  });
});
