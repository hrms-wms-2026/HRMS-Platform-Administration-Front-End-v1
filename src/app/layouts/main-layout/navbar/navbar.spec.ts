import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Navbar } from './navbar';
import { AuthService } from '../../../core/auth/auth.service';
import { SessionService } from '../../../core/auth/session.service';

describe('Navbar', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [{ provide: AuthService, useValue: { logout: jest.fn() } }, provideRouter([]), SessionService],
    }).compileComponents();
  });

  it('renders the profile menu', () => {
    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-profile-menu')).toBeTruthy();
  });
});
