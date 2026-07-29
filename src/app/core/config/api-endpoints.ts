export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    context: '/auth/me',
    mfaEnable: '/auth/mfa/enable',
    mfaConfirmSetup: '/auth/mfa/confirm-setup',
    mfaVerify: '/auth/mfa/verify',
  },
} as const;
