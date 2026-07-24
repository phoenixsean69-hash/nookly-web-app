import { Models } from 'appwrite';

export interface Tenant extends Models.Document {
  name: string;
  identifier: string;  // Student ID, National ID, or unique identifier
  phone: string;
  propertyName: string;
   status: 'active' | 'inactive' | 'pending' | 'pending_request';
  monthlyRent: number;
  leaseStartDate: string;
  avatar?: string;
}