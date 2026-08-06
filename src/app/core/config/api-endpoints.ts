export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    context: '/auth/me',
    mfaEnable: '/auth/mfa/enable',
    mfaConfirmSetup: '/auth/mfa/confirm-setup',
    mfaVerify: '/auth/mfa/verify',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
  },
  platformUsers: {
    list: '/platform-access/users',
    invite: '/platform-access/users/invite',
    revokeInvite: (platformUserId: string) => `/platform-access/users/${platformUserId}/revoke-invite`,
  },
  platformRoles: {
    list: '/platform-access/roles',
  },
} as const;
