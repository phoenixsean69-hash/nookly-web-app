import { NextRequest, NextResponse } from "next/server";
import { account } from "@/lib/appwrite/config";
import speakeasy from "speakeasy";

export async function POST(request: NextRequest) {
  try {
    // Get the current user session
    // This should work if the user is logged in
    const session = await account.get();
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Please log in" },
        { status: 401 }
      );
    }

    // Generate secret key
    const secret = speakeasy.generateSecret({
      name: `Nookly:${session.email || session.name || "User"}`,
      length: 20,
    });

    // Store the secret in the session or return it
    // In a real app, you'd store this in the database temporarily
    // For now, we'll return it and the frontend will store it in state
    return NextResponse.json({
      success: true,
      secret: secret.base32,
    });
  } catch (error: any) {
    console.error("Error generating 2FA secret:", error);
    
    // Handle specific Appwrite errors
    if (error.code === 401) {
      return NextResponse.json(
        { error: "Please log in to enable 2FA" },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to generate 2FA secret: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}