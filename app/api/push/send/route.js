// app/api/push/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';

// Configure web-push
webpush.setVapidDetails(
  'mailto:admin@yourdomain.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId, title, body, data } = await request.json();

    // Get user's push subscription from database
    const subscriptions = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      'push_subscriptions',
      [Query.equal('userId', userId), Query.equal('isActive', true)]
    );

    if (subscriptions.documents.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'No active subscriptions found' 
      });
    }

    const sentNotifications = [];

    for (const subDoc of subscriptions.documents) {
      try {
        const subscription = JSON.parse(subDoc.subscription);
        
        const payload = JSON.stringify({
          title: title || '🏠 New Property Request',
          body: body || 'Someone is requesting information about a property',
          icon: '/logo-192.png',
          badge: '/badge-icon.png',
          data: data || { url: '/dashboard/messages' },
        });

        await webpush.sendNotification(subscription, payload);
        sentNotifications.push({ success: true, subscriptionId: subDoc.$id });
      } catch (error) {
        console.error('Error sending to subscription:', error);
        
        // If subscription is invalid, mark it as inactive
        if (error.statusCode === 410) {
          await databases.updateDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            'push_subscriptions',
            subDoc.$id,
            { isActive: false }
          );
        }
        
        sentNotifications.push({ success: false, subscriptionId: subDoc.$id, error });
      }
    }

    return NextResponse.json({
      success: true,
      sent: sentNotifications.filter(n => n.success).length,
      total: sentNotifications.length,
    });
  } catch (error) {
    console.error('❌ Error sending push notification:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send push notification' },
      { status: 500 }
    );
  }
}