import { Models } from 'appwrite';

export interface Query extends Models.Document {
  writer: string;
  body: string;
  referenceProperty: string;
  category: "information" | "complaint" | "other";
  avatar?: string;
  snap?: string;
  status: "pending" | "resolved" | "in-progress";
  response?: string;
  respondedAt?: string;
}