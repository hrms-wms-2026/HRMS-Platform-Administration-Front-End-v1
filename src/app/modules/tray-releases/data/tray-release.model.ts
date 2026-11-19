export type TrayReleaseChannel = 'stable' | 'beta';

export interface TrayRelease {
  id: string;
  version: string;
  channel: TrayReleaseChannel;
  downloadUrl: string;
  sha256: string;
  fileSizeBytes: number;
  publisher: string;
  minimumWindowsVersion: string;
  minSupportedVersion: string | null;
  releaseNotes: string | null;
  isActive: boolean;
  source: 'admin' | 'ci';
  createdAt: string;
  updatedAt: string;
}

export interface CreateTrayReleasePayload {
  version: string;
  channel: TrayReleaseChannel;
  downloadUrl: string;
  sha256: string;
  fileSizeBytes: number;
  publisher: string;
  minimumWindowsVersion: string;
  minSupportedVersion: string | null;
  releaseNotes: string | null;
  isActive: boolean;
}

/** null = leave unchanged; '' clears minSupportedVersion / releaseNotes. */
export interface UpdateTrayReleasePayload {
  channel?: TrayReleaseChannel | null;
  minSupportedVersion?: string | null;
  releaseNotes?: string | null;
  isActive?: boolean | null;
}
