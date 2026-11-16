// Copied from Hrms--Web-application---front-end---v1 src/app/shared/ui/rich-text-editor/rich-text-editor.basic.spec.ts at 726d4c81. Change it there first, then copy.
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { RichTextEditorComponent } from './rich-text-editor.component';
import { RICH_TEXT_IMAGE_UPLOADER, RichTextImageUploader } from './rich-text-image-uploader';

const uploader: RichTextImageUploader = {
  upload: jest.fn().mockReturnValue(of({ fileId: 'f1', url: 'http://test/files/f1' }))
};

function titles(fixture: ComponentFixture<RichTextEditorComponent>): string[] {
  return [...(fixture.nativeElement as HTMLElement).querySelectorAll('button[title]')].map((b) => b.getAttribute('title') ?? '');
}

describe('RichTextEditorComponent basic toolset', () => {
  async function setup(toolset: 'full' | 'basic', withUploader = true): Promise<ComponentFixture<RichTextEditorComponent>> {
    await TestBed.configureTestingModule({
      imports: [RichTextEditorComponent],
      providers: withUploader ? [{ provide: RICH_TEXT_IMAGE_UPLOADER, useValue: uploader }] : []
    }).compileComponents();
    const fixture = TestBed.createComponent(RichTextEditorComponent);
    fixture.componentRef.setInput('toolset', toolset);
    fixture.componentRef.setInput('activateOnClick', false);
    fixture.detectChanges();
    return fixture;
  }

  it('hides colour, highlight, checklist and image tools', async () => {
    const fixture = await setup('basic');

    const shown = titles(fixture);
    expect(shown.some((t) => t.startsWith('Text color'))).toBe(false);
    expect(shown.some((t) => t.startsWith('Highlight'))).toBe(false);
    expect(shown.some((t) => t.startsWith('Checklist'))).toBe(false);
    expect(shown.some((t) => t.startsWith('Insert image'))).toBe(false);
    expect(shown.some((t) => t.startsWith('Bold'))).toBe(true);
    expect(shown.some((t) => t.startsWith('Link'))).toBe(true);
  });

  it('offers no checklist, highlight, divider, image or attachment slash commands', async () => {
    const fixture = await setup('basic');

    const ids = fixture.componentInstance.allSlashCommands().map((c) => c.id);
    expect(ids).not.toEqual(expect.arrayContaining(['checklist']));
    for (const id of ['checklist', 'highlight', 'divider', 'image', 'attach']) {
      expect(ids).not.toContain(id);
    }
    expect(ids).toContain('bold');
  });

  it('emits only allowlisted markup', async () => {
    const fixture = await setup('basic');
    const emitted: string[] = [];
    fixture.componentInstance.htmlChange.subscribe((html) => emitted.push(html));
    const editor = fixture.componentInstance.contentEditor()!.nativeElement;

    editor.innerHTML = '<p><span style="color:red">Hi</span> <a href="javascript:x()">there</a><img src="x.png"></p>';
    fixture.componentInstance.onEditorInput();

    expect(emitted.at(-1)).toBe('<p>Hi <a>there</a></p>');
  });

  it('keeps the full toolset unchanged by default', async () => {
    const fixture = await setup('full');

    expect(titles(fixture).some((t) => t.startsWith('Checklist'))).toBe(true);
    expect(fixture.componentInstance.allSlashCommands().map((c) => c.id)).toContain('divider');
  });

  it('has no image tool when no image uploader is provided', async () => {
    const fixture = await setup('full', false);

    expect(titles(fixture).some((t) => t.startsWith('Insert image'))).toBe(false);
    expect(fixture.componentInstance.allSlashCommands().map((c) => c.id)).not.toContain('image');
  });
});
