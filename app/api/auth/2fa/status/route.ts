import { NextRequest, NextResponse } from "next/server";
import { account, databases } from "@/lib/appwrite/config";
import { Query } from "appwrite";

export async function GET(request: NextRequest) {
  try {
    // Get current user session
    const session = await account.get();
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user's 2FA settings
    const settings = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_2FA_COLLECTION_ID!,
      [
        Query.equal("userId", session.$id),
        Query.equal("enabled", true),
      ]
    );

    if (settings.documents.length > 0) {
      return NextResponse.json({
        enabled: true,
        backupCodes: settings.documents[0].backupCodes || [],
      });
    }

    return NextResponse.json({
      enabled: false,
    });
  } catch (error) {
    console.error("Error checking 2FA status:", error);
    return NextResponse.json(
      { error: "Failed to check 2FA status" },
      { status: 500 }
    );
  }
}