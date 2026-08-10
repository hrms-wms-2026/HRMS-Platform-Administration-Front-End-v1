export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
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
    byId: (platformUserId: string) => `/platform-access/users/${platformUserId}`,
    updateRoles: (platformUserId: string) => `/platform-access/users/${platformUserId}/roles`,
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
    byId: (id: string) => `/subscription-plans/${id}`,
    create: '/subscription-plans',
    update: (id: string) => `/subscription-plans/${id}`,
    archive: (id: string) => `/subscription-plans/${id}`,
  },
  moduleCatalog: {
    list: '/modules/catalog',
  },
  auditLogs: {
    list: '/platform-access/auth-events',
  },
  logs: {
    create: '/logs',
  },
} as const;
