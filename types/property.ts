import type { Models } from "appwrite";

export interface Property extends Models.Document {
  propertyName: string;
  type: string;
  description: string;
  address: string;
  price: number;
  priceThreshold?: number;
  propertyType?: string;
  location?: string;
  latitude?: string | number;
  longitude?: string | number;
  area: number;
  bedrooms: number;
  bathrooms: number;
  facilities: string;
  image1: string;
  image2: string;
  image3: string;
  creatorId: string;
  organizationApproved?: boolean | null;
  rating?: number;
  review?: string;
  likes?: number;
  agent?: string;
  reviews?: string;
  isAvailable?: boolean;
  roomFor?: number;
  curfew?: string;
  views?: number;
  requests?: number;
  totalSlots?: number;
  occupiedSlots?: number;
  availableSlots?: number;
}
