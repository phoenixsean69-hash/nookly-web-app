// app/api/push/subscribe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { databases } from '@/lib/appwrite/config';
import { ID } from 'appwrite';

export async function POST(request: NextRequest) {
  try {
    const { subscription, userId } = await request.json();

    // Store subscription in your database
    await databases.createDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      'push_subscriptions', // Create this collection
      ID.unique(),
      {
        userId,
        subscription: JSON.stringify(subscription),
        createdAt: new Date().toISOString(),
        isActive: true,
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error saving push subscription:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save subscription' },
      { status: 500 }
    );
  }
}