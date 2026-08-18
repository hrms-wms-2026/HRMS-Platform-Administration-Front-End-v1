import { TestBed } from '@angular/core/testing';
import { RichTextEditor } from './rich-text-editor';

// jsdom does not implement execCommand at all, so jest.spyOn (which requires the property to
// already exist) has nothing to attach to until a stub is installed first.
if (!('execCommand' in document)) {
  (document as unknown as { execCommand: (...args: unknown[]) => boolean }).execCommand = () => true;
}

describe('RichTextEditor', () => {
  function setup() {
    TestBed.configureTestingModule({ imports: [RichTextEditor] }).compileComponents();
    const fixture = TestBed.createComponent(RichTextEditor);
    fixture.detectChanges();
    return fixture;
  }

  function editableEl(fixture: ReturnType<typeof setup>): HTMLDivElement {
    return fixture.nativeElement.querySelector('[contenteditable]');
  }

  it('writes the initial value into the contenteditable region', () => {
    const fixture = setup();
    const component = fixture.componentInstance;

    component.writeValue('<p>Hello</p>');
    fixture.detectChanges();

    expect(editableEl(fixture).innerHTML).toBe('<p>Hello</p>');
  });

  it('emits the new innerHTML on input', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    let emitted: string | undefined;
    component.registerOnChange((value) => (emitted = value));

    const el = editableEl(fixture);
    el.innerHTML = '<p>Typed text</p>';
    el.dispatchEvent(new Event('input'));

    expect(emitted).toBe('<p>Typed text</p>');
  });

  it('normalizes whitespace-only content to an empty string', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    let emitted: string | undefined;
    component.registerOnChange((value) => (emitted = value));

    const el = editableEl(fixture);
    el.innerHTML = '<br>';
    el.dispatchEvent(new Event('input'));

    expect(emitted).toBe('');
  });

  it('clears a leftover empty list/formatting scaffold on blur', () => {
    const fixture = setup();

    const el = editableEl(fixture);
    el.innerHTML = '<ul><li><br></li></ul>';
    el.dispatchEvent(new Event('blur'));

    expect(el.innerHTML).toBe('');
  });

  it('keeps real content on blur', () => {
    const fixture = setup();

    const el = editableEl(fixture);
    el.innerHTML = '<p>Hello</p>';
    el.dispatchEvent(new Event('blur'));

    expect(el.innerHTML).toBe('<p>Hello</p>');
  });

  it('calls onTouched on blur', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    let touched = false;
    component.registerOnTouched(() => (touched = true));

    editableEl(fixture).dispatchEvent(new Event('blur'));

    expect(touched).toBe(true);
  });

  it('setDisabledState disables the toolbar buttons and the editable region', () => {
    const fixture = setup();
    const component = fixture.componentInstance;

    component.setDisabledState(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button[disabled]')).toBeTruthy();
    expect(editableEl(fixture).getAttribute('contenteditable')).toBe('false');
  });

  it('runCommand focuses the editor and invokes document.execCommand with the given command', () => {
    const fixture = setup();
    const execSpy = jest.spyOn(document, 'execCommand').mockReturnValue(true);

    const boldButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLButtonElement).title === 'Bold',
    ) as HTMLButtonElement;
    boldButton.click();

    expect(execSpy).toHaveBeenCalledWith('bold', false, undefined);
    execSpy.mockRestore();
  });

  function findButton(fixture: ReturnType<typeof setup>, title: string): HTMLButtonElement {
    return Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b) => (b as HTMLButtonElement).title === title,
    ) as HTMLButtonElement;
  }

  it('insertLink opens an inline URL prompt instead of window.prompt', () => {
    const fixture = setup();
    const component = fixture.componentInstance;

    findButton(fixture, 'Insert link').click();
    fixture.detectChanges();

    expect(component['activePrompt']()).toBe('link');
    expect(fixture.nativeElement.querySelector('input[type="url"]')).toBeTruthy();
  });

  it('confirmPrompt runs createLink with the entered URL and closes the prompt', () => {
    const fixture = setup();
    const execSpy = jest.spyOn(document, 'execCommand').mockReturnValue(true);
    const component = fixture.componentInstance;

    findButton(fixture, 'Insert link').click();
    fixture.detectChanges();
    component['promptValue'].set('https://onevo.io');
    component['confirmPrompt']();

    expect(execSpy).toHaveBeenCalledWith('createLink', false, 'https://onevo.io');
    expect(component['activePrompt']()).toBeNull();
    execSpy.mockRestore();
  });

  it('insertImage opens the same inline prompt wired to insertImage', () => {
    const fixture = setup();
    const execSpy = jest.spyOn(document, 'execCommand').mockReturnValue(true);
    const component = fixture.componentInstance;

    findButton(fixture, 'Insert image').click();
    fixture.detectChanges();
    expect(component['activePrompt']()).toBe('image');

    component['promptValue'].set('https://onevo.io/pic.png');
    component['confirmPrompt']();

    expect(execSpy).toHaveBeenCalledWith('insertImage', false, 'https://onevo.io/pic.png');
    execSpy.mockRestore();
  });

  it('confirmPrompt does nothing and closes when the URL is blank', () => {
    const fixture = setup();
    const execSpy = jest.spyOn(document, 'execCommand').mockReturnValue(true);
    const component = fixture.componentInstance;

    findButton(fixture, 'Insert link').click();
    component['confirmPrompt']();

    expect(execSpy).not.toHaveBeenCalled();
    expect(component['activePrompt']()).toBeNull();
    execSpy.mockRestore();
  });

  it('cancelPrompt closes without running any command', () => {
    const fixture = setup();
    const execSpy = jest.spyOn(document, 'execCommand').mockReturnValue(true);
    const component = fixture.componentInstance;

    findButton(fixture, 'Insert link').click();
    component['promptValue'].set('https://onevo.io');
    component['cancelPrompt']();

    expect(execSpy).not.toHaveBeenCalled();
    expect(component['activePrompt']()).toBeNull();
    execSpy.mockRestore();
  });
});
