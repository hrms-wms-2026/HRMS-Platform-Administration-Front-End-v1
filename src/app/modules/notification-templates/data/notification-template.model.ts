/** Wire shapes of the backend admin notification APIs (admin/v1/notification-events, admin/v1/notification-templates). */

export type NotificationChannel = 'in_app' | 'email' | 'tray';

export interface NotificationVariable {
  key: string;
  type: string;
  required: boolean;
}

/** A code-registered event. Templates can only be written for these. */
export interface NotificationEvent {
  key: string;
  module: string;
  displayName: string;
  supportedChannels: NotificationChannel[];
  defaultChannels: NotificationChannel[];
  requiredChannels: NotificationChannel[];
  variables: NotificationVariable[];
  recipientRules: string[];
  actionKeys: string[];
  /** Delivered by the orchestrator: alternate templates and email/tray copy are used. Built-in events only use
   * the default template's in-app copy. */
  customizable: boolean;
}

export interface NotificationTemplateContent {
  inAppTitle: string;
  inAppBody: string;
  emailSubject: string | null;
  emailHtml: string | null;
  emailCss: string | null;
  emailText: string | null;
  trayTitle: string | null;
  trayBody: string | null;
  actionKey: string;
}

export interface NotificationTemplateSummary {
  id: string;
  code: string;
  eventKey: string;
  name: string;
  locale: string;
  isProductDefault: boolean;
  activeVersion: number | null;
  hasDraft: boolean;
  updatedAt: string | null;
}

export interface NotificationTemplateVersion extends NotificationTemplateContent {
  id: string;
  version: number;
  status: 'draft' | 'published' | string;
  revision: number;
  createdAt: string;
  createdByUserId: string | null;
  updatedAt: string | null;
  publishedAt: string | null;
  publishedByUserId: string | null;
}

export interface NotificationTemplateVersionSummary {
  id: string;
  version: number;
  status: string;
  createdAt: string;
  publishedAt: string | null;
  publishedByUserId: string | null;
}

export interface NotificationTemplateDetail {
  id: string;
  code: string;
  eventKey: string;
  name: string;
  locale: string;
  isProductDefault: boolean;
  activeVersion: NotificationTemplateVersion | null;
  draft: NotificationTemplateVersion | null;
  versions: NotificationTemplateVersionSummary[];
}

export interface RenderedNotification {
  inAppTitle: string;
  inAppBody: string;
  emailSubject: string;
  emailHtml: string;
  emailText: string;
  trayTitle: string;
  trayBody: string;
  actionKey: string;
}

export interface NotificationTemplatePreview {
  isValid: boolean;
  errors: string[];
  rendered: RenderedNotification | null;
  sampleVariables: Record<string, string>;
}

export interface NotificationTestSendResult {
  channel: string;
  recipient: string;
  accepted: boolean;
  error: string | null;
}

export interface CreateNotificationTemplateRequest {
  eventKey: string;
  name: string;
  content: NotificationTemplateContent;
}

export const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  in_app: 'In-app',
  email: 'Email',
  tray: 'Tray',
};

export function emptyContent(): NotificationTemplateContent {
  return {
    inAppTitle: '', inAppBody: '', emailSubject: null, emailHtml: null, emailCss: null,
    emailText: null, trayTitle: null, trayBody: null, actionKey: 'open_related',
  };
}

export function contentOf(version: NotificationTemplateVersion): NotificationTemplateContent {
  const { inAppTitle, inAppBody, emailSubject, emailHtml, emailCss, emailText, trayTitle, trayBody, actionKey } = version;
  return { inAppTitle, inAppBody, emailSubject, emailHtml, emailCss, emailText, trayTitle, trayBody, actionKey };
}
