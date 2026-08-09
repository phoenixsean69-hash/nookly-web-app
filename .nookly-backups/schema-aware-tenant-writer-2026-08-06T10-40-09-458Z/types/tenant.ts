import type { Models } from "appwrite";

export interface Tenant extends Models.Document {
  organizationId: string;
  name: string;
  identifier: string;
  phone: string;
  email?: string;
  propertyName: string;
  status: "active" | "inactive" | "pending" | "pending_request";
  monthlyRent: number;
  leaseStartDate: string;
  avatar?: string;

  // Temporary compatibility with records produced by older portal code.
  Identifier?: string;
  tenantPhone?: string;
}
