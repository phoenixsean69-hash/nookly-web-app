const TENANT_COLLECTION_ID =
  process.env
    .NEXT_PUBLIC_APPWRITE_ORGANIZATION_TENANTS_COLLECTION_ID ||
  process.env
    .NEXT_PUBLIC_APPWRITE_ORGANIZATION_TENANTS_TABLE_ID ||
  "6a2d99220019972d339e";

const ALLOWED_TENANT_COLUMNS =
  new Set<string>(
    [
  "name",
  "Identifier",
  "tenantPhone",
  "propertyName",
  "status",
  "monthlyRent",
  "leaseStartDate",
  "avatar",
  "organizationId",
  "email"
],
  );

const LOGICAL_TO_PHYSICAL =
  {
  "organizationId": "organizationId",
  "name": "name",
  "identifier": "Identifier",
  "phone": "tenantPhone",
  "email": "email",
  "propertyName": "propertyName",
  "propertyId": null,
  "tenantId": null,
  "status": "status",
  "monthlyRent": "monthlyRent",
  "leaseStartDate": "leaseStartDate",
  "avatar": "avatar"
} as const;

function mappedDestination(
  key: string,
): string | null {
  const direct =
    LOGICAL_TO_PHYSICAL[
      key as keyof typeof LOGICAL_TO_PHYSICAL
    ];

  return direct || null;
}

export function sanitizeTenantWriteData(
  collectionId: string,
  data: Record<string, unknown>,
): Record<string, unknown> {
  if (
    collectionId !==
      TENANT_COLLECTION_ID
  ) {
    return data;
  }

  const output:
    Record<string, unknown> = {};

  const omitted:
    string[] = [];

  for (
    const [
      key,
      value,
    ] of Object.entries(data)
  ) {
    if (
      ALLOWED_TENANT_COLUMNS.has(
        key,
      )
    ) {
      output[key] = value;
      continue;
    }

    const destination =
      mappedDestination(key);

    if (
      destination &&
      ALLOWED_TENANT_COLUMNS.has(
        destination,
      )
    ) {
      if (
        output[destination] ===
        undefined
      ) {
        output[destination] =
          value;
      }

      continue;
    }

    omitted.push(key);
  }

  if (
    omitted.length > 0 &&
    typeof console !==
      "undefined"
  ) {
    console.warn(
      "Omitted unsupported tenant attributes:",
      omitted,
    );
  }

  return output;
}

export const tenantSchemaGuardInfo = {
  collectionId:
    TENANT_COLLECTION_ID,
  allowedColumns: [
    ...ALLOWED_TENANT_COLUMNS,
  ],
  aliases:
    LOGICAL_TO_PHYSICAL,
};
