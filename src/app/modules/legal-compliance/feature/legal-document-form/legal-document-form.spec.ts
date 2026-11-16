import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { LegalDocumentForm } from './legal-document-form';
import { RichTextEditorComponent } from '../../../../shared/ui/rich-text-editor/rich-text-editor.component';
import { LegalDocumentVersionDetail } from '../../data/legal-document.model';

function detail(overrides: Partial<LegalDocumentVersionDetail> = {}): LegalDocumentVersionDetail {
  return {
    id: 'doc-1',
    documentType: 'terms',
    version: '1.0',
    title: 'Terms',
    contentHtml: '<h1>Terms</h1><p>Body</p>',
    contentJson: {},
    isRequired: true,
    blockScope: 'dashboard',
    status: 'draft',
    ...overrides,
  } as LegalDocumentVersionDetail;
}

describe('LegalDocumentForm content editor', () => {
  let fixture: ComponentFixture<LegalDocumentForm>;

  function create(inputs: Record<string, unknown>): void {
    fixture = TestBed.createComponent(LegalDocumentForm);
    for (const [key, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(key, value);
    }
    fixture.detectChanges();
  }

  const editor = () => fixture.debugElement.query(By.directive(RichTextEditorComponent))?.componentInstance as
    | RichTextEditorComponent
    | undefined;

  it('edits the content with the basic rich text editor instead of an HTML textarea', () => {
    create({ mode: 'create' });

    expect(fixture.nativeElement.querySelector('textarea#contentHtml')).toBeNull();
    expect(editor()).toBeDefined();
    expect(editor()!.toolset()).toBe('basic');
    expect(editor()!.allowImages()).toBe(false);
    expect(editor()!.allowAttachments()).toBe(false);
  });

  it('seeds the editor with the saved content', () => {
    create({ mode: 'edit', initialValue: detail() });

    expect(editor()!.initialHtml()).toBe('<h1>Terms</h1><p>Body</p>');
  });

  it('submits the HTML the editor emits', () => {
    create({ mode: 'create' });
    const emitted: unknown[] = [];
    fixture.componentInstance.submitted.subscribe((payload) => emitted.push(payload));
    const component = fixture.componentInstance as unknown as {
      form: { patchValue(value: Record<string, unknown>): void };
      submit(): void;
    };
    component.form.patchValue({ version: '2.0', title: 'Terms v2' });

    editor()!.htmlChange.emit('<p>New <strong>terms</strong></p>');
    component.submit();

    expect(emitted).toHaveLength(1);
    expect((emitted[0] as { contentHtml: string }).contentHtml).toBe('<p>New <strong>terms</strong></p>');
  });

  it('shows published versions in the editor read-only', () => {
    create({ mode: 'edit', initialValue: detail({ status: 'published' }), readOnly: true });

    expect(editor()!.readOnly()).toBe(true);
  });
});
