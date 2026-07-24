import { NextRequest, NextResponse } from "next/server";
import { account, databases } from "@/lib/appwrite/config";
import { Query } from "appwrite";
import speakeasy from "speakeasy";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, token } = body;

    if (!userId || !token) {
      return NextResponse.json(
        { error: "User ID and token are required" },
        { status: 400 }
      );
    }

    // Get user's 2FA settings
    const settings = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_2FA_COLLECTION_ID!,
      [
        Query.equal("userId", userId),
        Query.equal("enabled", true),
      ]
    );

    if (settings.documents.length === 0) {
      return NextResponse.json(
        { error: "2FA not enabled for this user" },
        { status: 400 }
      );
    }

    const userSettings = settings.documents[0];
    const secret = userSettings.secret;

    // Verify the token
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: "base32",
      token: token,
      window: 1,
    });

    if (!verified) {
      // Check if it's a backup code
      const backupCodes = userSettings.backupCodes || [];
      const codeIndex = backupCodes.indexOf(token);
      
      if (codeIndex !== -1) {
        // Remove used backup code
        const updatedCodes = [...backupCodes];
        updatedCodes.splice(codeIndex, 1);
        
        await databases.updateDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_2FA_COLLECTION_ID!,
          userSettings.$id,
          {
            backupCodes: updatedCodes,
          }
        );
        
        return NextResponse.json({
          success: true,
          message: "Backup code used successfully",
        });
      }
      
      return NextResponse.json(
        { success: false, error: "Invalid verification code" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Verified successfully",
    });
  } catch (error) {
    console.error("Error verifying login 2FA:", error);
    return NextResponse.json(
      { error: "Failed to verify 2FA code" },
      { status: 500 }
    );
  }
}