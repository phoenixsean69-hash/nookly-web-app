export const CACHE_KEYS = {
  AUTH_STATE: "auth_state",
  USER: "user",
  ORGANIZATION: "organization",
  PROPERTIES: "properties",
  PROPERTY: (id: string) => `property_${id}`,
  TENANTS: "tenants",
  REQUESTS: "requests",
  TASKS: "tasks",
  QUERIES: "queries",
  STATS: "stats",

  organizationProperties: (organizationId: string) =>
    `organization_${organizationId}_properties`,
  organizationTenants: (organizationId: string) =>
    `organization_${organizationId}_tenants`,
  organizationRequests: (organizationId: string) =>
    `organization_${organizationId}_requests`,
  organizationTasks: (organizationId: string) =>
    `organization_${organizationId}_tasks`,
  organizationQueries: (organizationId: string) =>
    `organization_${organizationId}_queries`,
} as const;
