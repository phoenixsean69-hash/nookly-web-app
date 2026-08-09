export interface TenantWriteInput {
  organizationId?: string;
  name?: string;
  identifier?: string;
  phone?: string;
  email?: string;
  propertyName?: string;
  status?: string;
  monthlyRent?: number;
  leaseStartDate?: string;
  avatar?: string;
  tenantId?: string;
  propertyId?: string;
}

export const TENANT_TABLE_ID =
  "6a2d99220019972d339e";

export const TENANT_TABLE_COLUMNS =
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
] as const;

export const TENANT_COLUMN_MAP =
  {
  "organizationId": "organizationId",
  "name": "name",
  "identifier": "Identifier",
  "phone": "tenantPhone",
  "email": "email",
  "propertyName": "propertyName",
  "status": "status",
  "monthlyRent": "monthlyRent",
  "leaseStartDate": "leaseStartDate",
  "avatar": "avatar",
  "tenantId": null,
  "propertyId": null
} as const;

function assignMapped(
  output: Record<string, unknown>,
  physicalKey: string | null,
  value: unknown,
): void {
  if (
    !physicalKey ||
    value === undefined
  ) {
    return;
  }

  output[physicalKey] = value;
}

export function buildTenantWriteData(
  input: TenantWriteInput,
): Record<string, unknown> {
  const output:
    Record<string, unknown> = {};

  assignMapped(
    output,
    TENANT_COLUMN_MAP.organizationId,
    input.organizationId,
  );

  assignMapped(
    output,
    TENANT_COLUMN_MAP.name,
    input.name,
  );

  assignMapped(
    output,
    TENANT_COLUMN_MAP.identifier,
    input.identifier,
  );

  assignMapped(
    output,
    TENANT_COLUMN_MAP.phone,
    input.phone,
  );

  assignMapped(
    output,
    TENANT_COLUMN_MAP.email,
    input.email,
  );

  assignMapped(
    output,
    TENANT_COLUMN_MAP.propertyName,
    input.propertyName,
  );

  assignMapped(
    output,
    TENANT_COLUMN_MAP.status,
    input.status,
  );

  assignMapped(
    output,
    TENANT_COLUMN_MAP.monthlyRent,
    input.monthlyRent,
  );

  assignMapped(
    output,
    TENANT_COLUMN_MAP.leaseStartDate,
    input.leaseStartDate,
  );

  assignMapped(
    output,
    TENANT_COLUMN_MAP.avatar,
    input.avatar,
  );

  assignMapped(
    output,
    TENANT_COLUMN_MAP.tenantId,
    input.tenantId,
  );

  assignMapped(
    output,
    TENANT_COLUMN_MAP.propertyId,
    input.propertyId,
  );

  return output;
}
