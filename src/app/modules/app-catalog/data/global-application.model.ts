export const APPLICATION_CATEGORIES = [
  { value: 'meeting', label: 'Meeting application' },
  { value: 'documentation', label: 'Documentation application' },
  { value: 'browser', label: 'Browser application' },
  { value: 'development', label: 'Development application' },
  { value: 'communication', label: 'Communication application' },
  { value: 'office', label: 'Office application' },
  { value: 'design', label: 'Design application' },
  { value: 'productivity', label: 'Productivity application' },
  { value: 'other', label: 'Other' },
] as const;

export interface GlobalApplication {
  id: string;
  appName: string;
  processName: string;
  category: string | null;
  isAllocated: boolean;
  publisher: string | null;
  isPublic: boolean;
  isProductiveDefault: boolean;
  hasLogo: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
  updatedAt: string | null;
}

export interface UpdateGlobalApplicationPayload {
  appName: string;
  category: string | null;
  publisher: string | null;
  isPublic: boolean;
  isProductiveDefault: boolean;
}
