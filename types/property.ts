import { Models } from "appwrite";

export interface Property extends Models.Document {
  $createdAt: string;
  $updatedAt: string;

  propertyName: string;
  type: string;
  description: string;
  address: string;
  price: number;
  propertyType?: string;
  location?: string; 
  area: number;
  bedrooms: number;
  bathrooms: number;
  facilities: string;
  image1: string;
  image2: string;
  image3: string;

  rating?: number;
  review?: string;
  creatorId?: string;
  likes?: number;
  agent?: string;
  reviews?: string;
  isAvailable?: boolean;
  roomFor?: number;
  curfew?: string;
  views?: number;
  requests?: number;
}
