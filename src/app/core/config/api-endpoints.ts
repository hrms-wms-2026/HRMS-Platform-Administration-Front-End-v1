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
    acceptInvite: '/auth/accept-invite',
  },
  platformUsers: {
    list: '/platform-access/users',
    invite: '/platform-access/users/invite',
    revokeInvite: (platformUserId: string) => `/platform-access/users/${platformUserId}/revoke-invite`,
  },
  platformRoles: {
    list: '/platform-access/roles',
  },
  tenants: {
    list: '/tenants',
    byId: (id: string) => `/tenants/${id}`,
    status: (id: string) => `/tenants/${id}/status`,
    validate: '/tenants/validate',
    provisioningSummary: (id: string) => `/tenants/${id}/provisioning-summary`,
    confirmProvisioning: (id: string) => `/tenants/${id}/provision/confirm`,
  },
  roles: {
    list: '/platform-access/roles',
    byId: (id: string) => `/platform-access/roles/${id}`,
    permissions: '/platform-access/permissions',
    updatePermissions: (id: string) => `/platform-access/roles/${id}/permissions`,
  },
  subscriptionPlans: {
    list: '/subscription-plans',
  },
  logs: {
    create: '/logs',
  },
} as const;
