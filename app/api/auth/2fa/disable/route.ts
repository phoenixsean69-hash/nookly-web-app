import { NextRequest, NextResponse } from "next/server";
import { account, databases } from "@/lib/appwrite/config";
import { Query } from "appwrite";

export async function POST(request: NextRequest) {
  try {
    // Get current user session
    const session = await account.get();
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Find and delete 2FA settings
    const existingSettings = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_2FA_COLLECTION_ID!,
      [
        Query.equal("userId", session.$id),
      ]
    );

    if (existingSettings.documents.length > 0) {
      await databases.deleteDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_2FA_COLLECTION_ID!,
        existingSettings.documents[0].$id
      );
    }

    return NextResponse.json({
      success: true,
      message: "2FA disabled successfully",
    });
  } catch (error) {
    console.error("Error disabling 2FA:", error);
    return NextResponse.json(
      { error: "Failed to disable 2FA" },
      { status: 500 }
    );
  }
}