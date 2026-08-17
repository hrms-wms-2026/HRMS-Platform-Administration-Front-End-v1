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
    sessions: {
      list: (platformUserId: string) => `/platform-access/users/${platformUserId}/sessions`,
      revoke: (platformUserId: string, sessionId: string) =>
        `/platform-access/users/${platformUserId}/sessions/${sessionId}/revoke`,
      revokeAll: (platformUserId: string) => `/platform-access/users/${platformUserId}/sessions/revoke-all`,
    },
  },
  platformRoles: {
    list: '/platform-access/roles',
  },
  tenants: {
    list: '/tenants',
    byId: (id: string) => `/tenants/${id}`,
    update: (id: string) => `/tenants/${id}`,
    status: (id: string) => `/tenants/${id}/status`,
    validate: '/tenants/validate',
    provisioningSummary: (id: string) => `/tenants/${id}/provisioning-summary`,
    confirmProvisioning: (id: string) => `/tenants/${id}/provision/confirm`,
    inviteAdmin: (id: string) => `/tenants/${id}/invite-admin`,
    roles: {
      list: (tenantId: string) => `/tenants/${tenantId}/roles`,
      create: (tenantId: string) => `/tenants/${tenantId}/roles`,
      updatePermissions: (tenantId: string, roleId: string) =>
        `/tenants/${tenantId}/roles/${roleId}/permissions`,
    },
    roleTemplates: {
      apply: (tenantId: string, templateId: string) =>
        `/tenants/${tenantId}/role-templates/${templateId}/apply`,
    },
    permissions: {
      catalog: (tenantId: string) => `/tenants/${tenantId}/permissions/catalog`,
    },
  },
  tenantSubscriptions: {
    get: (tenantId: string) => `/tenants/${tenantId}/subscription`,
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
  invoices: {
    list: '/invoices',
    byId: (id: string) => `/invoices/${id}`,
    listByTenant: (tenantId: string) => `/tenants/${tenantId}/invoices`,
    create: '/invoices',
    markPaid: (id: string) => `/invoices/${id}/mark-paid`,
    void: (id: string) => `/invoices/${id}/void`,
    resendEmail: (id: string) => `/invoices/${id}/resend-email`,
  },
  moduleCatalog: {
    list: '/modules/catalog',
    permissions: (moduleKey: string) => `/modules/catalog/${moduleKey}/permissions`,
  },
  roleTemplates: {
    list: '/role-templates',
    create: '/role-templates',
    update: (id: string) => `/role-templates/${id}`,
  },
  legalDocuments: {
    list: '/legal-document-versions',
    byId: (id: string) => `/legal-document-versions/${id}`,
    create: '/legal-document-versions',
    update: (id: string) => `/legal-document-versions/${id}`,
    publish: (id: string) => `/legal-document-versions/${id}/publish`,
    archive: (id: string) => `/legal-document-versions/${id}/archive`,
  },
  configurationTemplates: {
    list: '/configuration-templates',
    byId: (id: string) => `/configuration-templates/${id}`,
    create: '/configuration-templates',
    update: (id: string) => `/configuration-templates/${id}`,
    deactivate: (id: string) => `/configuration-templates/${id}`,
    clone: (id: string) => `/configuration-templates/${id}/clone`,
  },
  tenantConfigurationTemplates: {
    apply: (tenantId: string, templateId: string) =>
      `/tenants/${tenantId}/configuration-templates/${templateId}/apply`,
  },
  auditLogs: {
    list: '/platform-access/auth-events',
  },
  systemConfig: {
    oauthApps: {
      list: '/system-config/oauth-apps',
      byId: (provider: string) => `/system-config/oauth-apps/${provider}`,
      configure: (provider: string) => `/system-config/oauth-apps/${provider}`,
      rotateSecret: (provider: string) => `/system-config/oauth-apps/${provider}/rotate-secret`,
      activate: (provider: string) => `/system-config/oauth-apps/${provider}/activate`,
      deactivate: (provider: string) => `/system-config/oauth-apps/${provider}/deactivate`,
      validateConfig: (provider: string) => `/system-config/oauth-apps/${provider}/validate-config`,
    },
    serviceKeys: {
      list: '/system-config/service-keys',
      providers: '/system-config/service-key-providers',
      create: '/system-config/service-keys',
      update: (serviceKey: string) => `/system-config/service-keys/${serviceKey}`,
      rotateKey: (serviceKey: string) => `/system-config/service-keys/${serviceKey}/rotate-key`,
      verify: (serviceKey: string) => `/system-config/service-keys/${serviceKey}/verify`,
      activate: (serviceKey: string) => `/system-config/service-keys/${serviceKey}/activate`,
      deactivate: (serviceKey: string) => `/system-config/service-keys/${serviceKey}/deactivate`,
    },
    providers: {
      list: '/system-config/providers',
    },
    integrations: {
      list: '/system-config/integrations',
      byKey: (integrationKey: string) => `/system-config/integrations/${integrationKey}`,
      create: '/system-config/integrations',
      update: (integrationKey: string) => `/system-config/integrations/${integrationKey}`,
      activate: (integrationKey: string) => `/system-config/integrations/${integrationKey}/activate`,
      deactivate: (integrationKey: string) => `/system-config/integrations/${integrationKey}/deactivate`,
      linkModule: (integrationKey: string, moduleKey: string) =>
        `/system-config/integrations/${integrationKey}/modules/${moduleKey}`,
      unlinkModule: (integrationKey: string, moduleKey: string) =>
        `/system-config/integrations/${integrationKey}/modules/${moduleKey}`,
    },
    paymentGateways: {
      list: '/system-config/payment-gateways',
      providers: '/system-config/payment-gateway-providers',
      verify: '/system-config/payment-gateways/verify',
      create: '/system-config/payment-gateways',
      update: (id: string) => `/system-config/payment-gateways/${id}`,
      rotateCredentials: (id: string) => `/system-config/payment-gateways/${id}/credentials/rotate`,
      resolve: '/payment-gateways/resolve',
    },
    tenantIntegrations: {
      list: '/system-config/tenant-integrations',
      byId: (id: string) => `/system-config/tenant-integrations/${id}`,
      disconnect: (id: string) => `/system-config/tenant-integrations/${id}/disconnect`,
    },
  },
  support: {
    tickets: {
      list: '/support/tickets',
      byId: (ticketId: string) => `/support/tickets/${ticketId}`,
      create: '/support/tickets',
      updateStatus: (ticketId: string) => `/support/tickets/${ticketId}/status`,
      addComment: (ticketId: string) => `/support/tickets/${ticketId}/comments`,
    },
  },
  logs: {
    create: '/logs',
  },
  reference: {
    countryDefaults: (countryCode: string) => `/reference/countries/${countryCode}/defaults`,
  },
} as const;
