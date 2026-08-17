export interface PlatformUserSession {
  id: string;
  userId: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  expiresAt: string;
  createdAt: string;
  revokedAt: string | null;
  isRevoked: boolean;
}

export function platformUserSessionStatus(
  session: PlatformUserSession,
): 'active' | 'revoked' | 'expired' {
  if (session.isRevoked) {
    return 'revoked';
  }
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    return 'expired';
  }
  return 'active';
}

export function platformUserSessionStatusLabel(status: ReturnType<typeof platformUserSessionStatus>): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'revoked':
      return 'Revoked';
    case 'expired':
      return 'Expired';
  }
}

export function platformUserSessionStatusTone(
  status: ReturnType<typeof platformUserSessionStatus>,
): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'active':
      return 'success';
    case 'expired':
      return 'warning';
    case 'revoked':
      return 'neutral';
  }
}
