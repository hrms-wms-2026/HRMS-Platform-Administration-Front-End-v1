import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { InviteManagerModal } from './invite-manager-modal';
import { PlatformUsersService } from '../../data/platform-users.service';

describe('InviteManagerModal', () => {
  let usersService: { invite: jest.Mock; listRoles: jest.Mock };

  beforeEach(async () => {
    usersService = {
      invite: jest.fn(),
      listRoles: jest.fn().mockReturnValue(of([
        { id: 'role-1', name: 'Manager' },
        { id: 'role-2', name: 'Support' },
      ])),
    };

    await TestBed.configureTestingModule({
      imports: [InviteManagerModal],
      providers: [{ provide: PlatformUsersService, useValue: usersService }],
    }).compileComponents();
  });

  function createComponent() {
    const fixture = TestBed.createComponent(InviteManagerModal);
    fixture.detectChanges();
    return fixture;
  }

  it('loads roles on init', () => {
    createComponent();
    expect(usersService.listRoles).toHaveBeenCalled();
  });

  it('is invalid with no email, no full name, or no role selected', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    expect(component['inviteFormInvalid']).toBe(true);

    component['inviteForm'].patchValue({ email: 'new@example.com', fullName: 'New Manager' });
    expect(component['inviteFormInvalid']).toBe(true); // form fields valid, but no role selected yet

    component['toggleRole']('role-1');
    expect(component['inviteFormInvalid']).toBe(false);
  });

  it('submits with the selected roles and emits invited on success', () => {
    usersService.invite.mockReturnValue(of(undefined));
    const fixture = createComponent();
    const component = fixture.componentInstance;
    let invitedEmitted = false;
    component.invited.subscribe(() => (invitedEmitted = true));

    component['inviteForm'].patchValue({ email: 'new@example.com', fullName: 'New Manager' });
    component['toggleRole']('role-1');
    component.submit();

    expect(usersService.invite).toHaveBeenCalledWith('new@example.com', 'New Manager', ['role-1']);
    expect(invitedEmitted).toBe(true);
  });

  it('shows an inline error and does not emit invited on failure', () => {
    usersService.invite.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    const fixture = createComponent();
    const component = fixture.componentInstance;
    let invitedEmitted = false;
    component.invited.subscribe(() => (invitedEmitted = true));

    component['inviteForm'].patchValue({ email: 'existing@example.com', fullName: 'New Manager' });
    component['toggleRole']('role-1');
    component.submit();

    expect(component['errorMessage']()).toBeTruthy();
    expect(invitedEmitted).toBe(false);
  });
});
