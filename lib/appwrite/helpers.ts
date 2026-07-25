import { Models, Query } from "appwrite";
import { databases } from "./config";

const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const organizationsCollectionId =
  process.env.NEXT_PUBLIC_APPWRITE_ORGANIZATIONS_COLLECTION_ID!;
const propertiesCollectionId =
  process.env.NEXT_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID!;
const tenantsCollectionId =
  process.env.NEXT_PUBLIC_APPWRITE_ORGANIZATION_TENANTS_COLLECTION_ID!;
const requestsCollectionId =
  process.env.NEXT_PUBLIC_APPWRITE_REQUESTS_COLLECTION_ID!;
const tasksCollectionId =
  process.env.NEXT_PUBLIC_APPWRITE_TASKS_COLLECTION_ID!;
const queriesCollectionId =
  process.env.NEXT_PUBLIC_APPWRITE_QUERIES_COLLECTION_ID!;

export interface OwnedProperty extends Models.Document {
  creatorId: string;
  propertyName: string;
  address?: string;
  type?: string;
  price?: number;
  roomFor?: number;
  isAvailable?: boolean;
}

export interface OwnedTenant extends Models.Document {
  organizationId?: string;
  name?: string;
  identifier?: string;
  Identifier?: string;
  phone?: string;
  tenantPhone?: string;
  email?: string;
  propertyName?: string;
  status?: string;
  monthlyRent?: number;
  leaseStartDate?: string;
  avatar?: string;
}

export interface OwnedRequest extends Models.Document {
  propertyId: string;
  propertyName?: string;
  tenantId?: string;
  tenantName?: string;
  tenantEmail?: string;
  tenantPhone?: string;
  tenantAvatar?: string;
  status?: string;
  proposedPrice?: number;
  moveInDate?: string;
  rejectionReason?: string;
}

export interface OwnedTask extends Models.Document {
  organizationId: string;
  title: string;
  description?: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in-progress" | "completed";
  dueDate: string;
  propertyId?: string;
  propertyName?: string;
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function chunks<T>(items: T[], size = 100): T[][] {
  const result: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }

  return result;
}

export async function listOrganizationProperties(
  creatorId: string,
  additionalQueries: string[] = [],
): Promise<OwnedProperty[]> {
  if (!creatorId) return [];

  const response = await databases.listDocuments(
    databaseId,
    propertiesCollectionId,
    [
      Query.equal("creatorId", creatorId),
      ...additionalQueries,
      Query.limit(1000),
    ],
  );

  return response.documents as unknown as OwnedProperty[];
}

export async function getOrganizationPropertyReferences(
  creatorId: string,
): Promise<string[]> {
  const properties = await listOrganizationProperties(creatorId);

  return unique(
    properties.flatMap((property) =>
      [property.$id, property.propertyName].filter(
        (value): value is string => Boolean(value),
      ),
    ),
  );
}

export async function getOwnedProperty(
  propertyId: string,
  creatorId: string,
): Promise<OwnedProperty> {
  const property = (await databases.getDocument(
    databaseId,
    propertiesCollectionId,
    propertyId,
  )) as unknown as OwnedProperty;

  if (property.creatorId !== creatorId) {
    throw new Error("You do not have access to this property.");
  }

  return property;
}

export async function getOwnedTenant(
  tenantId: string,
  organizationId: string,
): Promise<OwnedTenant> {
  const tenant = (await databases.getDocument(
    databaseId,
    tenantsCollectionId,
    tenantId,
  )) as unknown as OwnedTenant;

  if (tenant.organizationId !== organizationId) {
    throw new Error("You do not have access to this tenant.");
  }

  return tenant;
}

export async function getOwnedRequest(
  requestId: string,
  creatorId: string,
): Promise<OwnedRequest> {
  const request = (await databases.getDocument(
    databaseId,
    requestsCollectionId,
    requestId,
  )) as unknown as OwnedRequest;

  await getOwnedProperty(request.propertyId, creatorId);
  return request;
}

export async function getOwnedTask(
  taskId: string,
  organizationId: string,
): Promise<OwnedTask> {
  const task = (await databases.getDocument(
    databaseId,
    tasksCollectionId,
    taskId,
  )) as unknown as OwnedTask;

  if (task.organizationId !== organizationId) {
    throw new Error("You do not have access to this task.");
  }

  return task;
}

export async function listOrganizationQueries(
  creatorId: string,
  additionalQueries: string[] = [],
): Promise<Models.Document[]> {
  const references = await getOrganizationPropertyReferences(creatorId);
  if (references.length === 0) return [];

  const responses = await Promise.all(
    chunks(references).map((referenceChunk) =>
      databases.listDocuments(databaseId, queriesCollectionId, [
        Query.equal("referenceProperty", referenceChunk),
        ...additionalQueries,
        Query.limit(1000),
      ]),
    ),
  );

  const byId = new Map<string, Models.Document>();

  responses
    .flatMap((response) => response.documents)
    .forEach((document) => byId.set(document.$id, document));

  return Array.from(byId.values()).sort(
    (first, second) =>
      new Date(second.$createdAt).getTime() -
      new Date(first.$createdAt).getTime(),
  );
}

export async function listOrganizationTenants(
  organizationId: string,
  additionalQueries: string[] = [],
): Promise<OwnedTenant[]> {
  if (!organizationId) return [];

  const response = await databases.listDocuments(
    databaseId,
    tenantsCollectionId,
    [
      Query.equal("organizationId", organizationId),
      ...additionalQueries,
      Query.limit(1000),
    ],
  );

  return response.documents as unknown as OwnedTenant[];
}

export async function listOrganizationRequests(
  creatorId: string,
  additionalQueries: string[] = [],
): Promise<OwnedRequest[]> {
  const properties = await listOrganizationProperties(creatorId);
  const propertyIds = properties.map((property) => property.$id);

  if (propertyIds.length === 0) return [];

  const responses = await Promise.all(
    chunks(propertyIds).map((propertyIdChunk) =>
      databases.listDocuments(databaseId, requestsCollectionId, [
        Query.equal("propertyId", propertyIdChunk),
        ...additionalQueries,
        Query.limit(1000),
      ]),
    ),
  );

  const byId = new Map<string, OwnedRequest>();

  responses
    .flatMap((response) => response.documents)
    .forEach((document) =>
      byId.set(document.$id, document as unknown as OwnedRequest),
    );

  return Array.from(byId.values()).sort(
    (first, second) =>
      new Date(second.$createdAt).getTime() -
      new Date(first.$createdAt).getTime(),
  );
}

export async function syncOrganizationPropertyCount(
  creatorId: string,
): Promise<number> {
  if (!creatorId) return 0;

  const [organizations, properties] = await Promise.all([
    databases.listDocuments(databaseId, organizationsCollectionId, [
      Query.equal("userId", creatorId),
      Query.limit(1),
    ]),
    databases.listDocuments(databaseId, propertiesCollectionId, [
      Query.equal("creatorId", creatorId),
      Query.limit(1),
    ]),
  ]);

  const organization = organizations.documents[0];
  if (!organization) return 0;

  await databases.updateDocument(
    databaseId,
    organizationsCollectionId,
    organization.$id,
    { properties: properties.total },
  );

  return properties.total;
}

/**
 * Kept for compatibility with existing pages. The count is recomputed rather
 * than incremented, preventing stale values and concurrent update races.
 */
export async function updateOrganizationPropertyCount(
  creatorId: string,
  _action: "increment" | "decrement",
): Promise<number> {
  return syncOrganizationPropertyCount(creatorId);
}
