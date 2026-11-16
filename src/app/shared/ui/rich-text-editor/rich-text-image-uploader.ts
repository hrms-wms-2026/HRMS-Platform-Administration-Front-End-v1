// Copied from Hrms--Web-application---front-end---v1 src/app/shared/ui/rich-text-editor/rich-text-image-uploader.ts at 726d4c81. Change it there first, then copy.
import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

/** What an inline image upload is for; the host app maps it to its own upload purpose. */
export type RichTextImagePurpose = 'task_description_image' | 'comment_description_image';

/**
 * Uploads inline images for the rich text editor. The editor injects it optionally: when no app
 * provides one, the image tool is not shown. Keeps the editor free of any feature module.
 */
export interface RichTextImageUploader {
  /** Uploads the file and returns the URL the editor inserts as the image source. */
  upload(file: File, purpose: RichTextImagePurpose): Observable<{ fileId: string; url: string }>;
}

export const RICH_TEXT_IMAGE_UPLOADER = new InjectionToken<RichTextImageUploader>('RICH_TEXT_IMAGE_UPLOADER');
