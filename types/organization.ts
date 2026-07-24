// types/organization.ts
export interface Organization {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  city: string;
  properties: number;
  type_of: string;
  userId: string;
  isActive: boolean;
  subscriptionTier: string;
  username: string;
}
