// lib/appwrite/helpers.ts
import { databases } from "./config";
import { Query } from "appwrite";

export const updateOrganizationPropertyCount = async (creatorId: string, action: 'increment' | 'decrement') => {
  if (!creatorId) {
    console.error("❌ creatorId is required");
    return 0;
  }
  
  try {
    console.log(`📊 ${action}ing property count for creatorId:`, creatorId);
    
    // Find the organization document that has this userId
    const organizations = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_ORGANIZATIONS_COLLECTION_ID!,
      [Query.equal("userId", creatorId)]
    );

    if (organizations.documents.length === 0) {
      console.error("❌ No organization found for userId:", creatorId);
      return 0;
    }

    const organization = organizations.documents[0];
    const organizationId = organization.$id;
    const currentCount = organization.properties || 0;
    
    let newCount = currentCount;
    if (action === 'increment') {
      newCount = currentCount + 1;
    } else if (action === 'decrement') {
      newCount = Math.max(0, currentCount - 1);
    }
    
    console.log(`📊 Current count: ${currentCount}, New count: ${newCount}`);

    // Update the organization with the new count
    await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_ORGANIZATIONS_COLLECTION_ID!,
      organizationId,
      {
        properties: newCount,
      }
    );

    console.log(`✅ Organization property count ${action}d to ${newCount}`);
    return newCount;
  } catch (error) {
    console.error(`❌ Error ${action}ing organization property count:`, error);
    throw error;
  }
};