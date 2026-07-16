export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    me: '/auth/me',
    refresh: '/auth/refresh',
    context: '/auth/context',
  },

  employees: {
    list: '/employees',
    detail: (id: string) => `/employees/${id}`,
  },

  projects: {
    list: '/projects',
    detail: (id: string) => `/projects/${id}`,
  },
} as const;