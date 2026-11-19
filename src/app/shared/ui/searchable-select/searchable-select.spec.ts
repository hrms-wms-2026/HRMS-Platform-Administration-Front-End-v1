import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SearchableSelect, SearchableSelectOption } from './searchable-select';

describe('SearchableSelect', () => {
  const options: SearchableSelectOption[] = [
    { value: 'us', label: 'United States' },
    { value: 'gb', label: 'United Kingdom' },
    { value: 'lk', label: 'Sri Lanka' },
  ];
  const pinned: SearchableSelectOption[] = [{ value: 'us', label: 'United States' }];

  function setup(extra: { pinned?: SearchableSelectOption[] } = {}) {
    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, SearchableSelect],
    }).compileComponents();

    const fixture = TestBed.createComponent(SearchableSelect);
    fixture.componentRef.setInput('options', options);
    if (extra.pinned) {
      fixture.componentRef.setInput('pinnedOptions', extra.pinned);
    }
    fixture.detectChanges();
    return fixture;
  }

  it('filters options when typing a query', () => {
    const fixture = setup();
    const component = fixture.componentInstance;

    component['onInput']('sri');

    expect(component['visibleOptions']().map((option) => option.value)).toEqual(['lk']);
  });

  it('shows pinned options when the query is empty', () => {
    const fixture = setup({ pinned });
    const component = fixture.componentInstance;

    component['onInputFocus']();

    expect(component['visibleOptions']()).toEqual(pinned);
  });

  it('selects an option and notifies the form control', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    const onChange = jest.fn();
    component.registerOnChange(onChange);

    component['selectOption'](options[1]);

    expect(component['value']()).toBe('gb');
    expect(onChange).toHaveBeenCalledWith('gb');
    expect(component['open']()).toBe(false);
  });

  it('clears the selection', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    const onChange = jest.fn();
    component.writeValue('gb');
    component.registerOnChange(onChange);
    fixture.detectChanges();

    component['clearSelection'](new MouseEvent('mousedown'));

    expect(component['value']()).toBe('');
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('selects the first visible option on Enter', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    const onChange = jest.fn();
    component.registerOnChange(onChange);
    component['onInput']('united');
    fixture.detectChanges();

    component['onInputKeydown'](new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(onChange).toHaveBeenCalledWith('us');
  });

  it('closes on Escape and document click outside', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    component['onInputFocus']();
    expect(component['open']()).toBe(true);

    component['onInputKeydown'](new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(component['open']()).toBe(false);

    component['onInputFocus']();
    component.onDocumentClick(new MouseEvent('click'));
    expect(component['open']()).toBe(false);
  });

  it('works as a ControlValueAccessor in a reactive form', () => {
    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, SearchableSelect],
    }).compileComponents();

    const hostFixture = TestBed.createComponent(SearchableSelect);
    hostFixture.componentRef.setInput('options', options);
    hostFixture.detectChanges();

    const control = new FormControl('');
    hostFixture.componentInstance.registerOnChange((value) => control.setValue(value, { emitEvent: false }));
    hostFixture.componentInstance.writeValue('lk');
    hostFixture.detectChanges();

    expect(hostFixture.componentInstance['selectedOption']()?.label).toBe('Sri Lanka');
  });
});
