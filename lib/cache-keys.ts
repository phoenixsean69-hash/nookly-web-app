

export const CACHE_KEYS = {
  AUTH_STATE: 'auth_state',
  USER: 'user',
  ORGANIZATION: 'organization',
  PROPERTIES: 'properties',
  PROPERTY: (id: string) => `property_${id}`,
  TENANTS: 'tenants',
  REQUESTS: 'requests',
  TASKS: 'tasks',
  QUERIES: 'queries',
  STATS: 'stats',
  REQUESTS: 'requests',
} as const;