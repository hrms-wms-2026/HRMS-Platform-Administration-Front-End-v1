export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    context: '/auth/me',
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