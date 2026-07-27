import { NextResponse } from "next/server";
import webpush from "web-push";
import { Client, Databases, Query } from "node-appwrite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getEnvironment() {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const apiKey =
    process.env.APPWRITE_API_KEY ||
    process.env.APPWRITE_SERVER_API_KEY;
  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
  const collectionId =
    process.env.NEXT_PUBLIC_APPWRITE_PUSH_SUBSCRIPTIONS_COLLECTION_ID ||
    "push_subscriptions";
  const vapidPublicKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject =
    process.env.VAPID_SUBJECT || "mailto:admin@nookly.app";

  const missing = [];

  if (!endpoint) missing.push("NEXT_PUBLIC_APPWRITE_ENDPOINT");
  if (!projectId) missing.push("NEXT_PUBLIC_APPWRITE_PROJECT_ID");
  if (!apiKey) missing.push("APPWRITE_API_KEY");
  if (!databaseId) {
    missing.push("NEXT_PUBLIC_APPWRITE_DATABASE_ID");
  }
  if (!vapidPublicKey) {
    missing.push("NEXT_PUBLIC_VAPID_PUBLIC_KEY");
  }
  if (!vapidPrivateKey) missing.push("VAPID_PRIVATE_KEY");

  if (missing.length > 0) {
    throw new Error(
      `Missing server environment variables: ${missing.join(", ")}`,
    );
  }

  return {
    endpoint,
    projectId,
    apiKey,
    databaseId,
    collectionId,
    vapidPublicKey,
    vapidPrivateKey,
    vapidSubject,
  };
}

function createServerDatabase(environment) {
  const client = new Client()
    .setEndpoint(environment.endpoint)
    .setProject(environment.projectId)
    .setKey(environment.apiKey);

  return new Databases(client);
}

function getPushStatusCode(error) {
  if (
    error &&
    typeof error === "object" &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  ) {
    return error.statusCode;
  }

  return null;
}

function getErrorMessage(error) {
  return error instanceof Error
    ? error.message
    : "Unknown push notification error";
}

export async function POST(request) {
  try {
    const environment = getEnvironment();
    const databases = createServerDatabase(environment);

    const payload = await request.json();
    const userId =
      typeof payload.userId === "string"
        ? payload.userId.trim()
        : "";
    const title =
      typeof payload.title === "string"
        ? payload.title.trim()
        : "";
    const body =
      typeof payload.body === "string"
        ? payload.body.trim()
        : "";
    const data =
      payload.data &&
      typeof payload.data === "object" &&
      !Array.isArray(payload.data)
        ? payload.data
        : { url: "/dashboard/messages" };

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "userId is required.",
        },
        { status: 400 },
      );
    }

    webpush.setVapidDetails(
      environment.vapidSubject,
      environment.vapidPublicKey,
      environment.vapidPrivateKey,
    );

    const subscriptions = await databases.listDocuments({
      databaseId: environment.databaseId,
      collectionId: environment.collectionId,
      queries: [
        Query.equal("userId", userId),
        Query.equal("isActive", true),
        Query.limit(100),
      ],
      total: true,
      ttl: 0,
    });

    if (subscriptions.documents.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No active push subscriptions were found.",
          sent: 0,
          total: 0,
        },
        { status: 404 },
      );
    }

    const notificationPayload = JSON.stringify({
      title: title || "New property request",
      body:
        body ||
        "Someone is requesting information about a property.",
      icon: "/images/icon.png",
      badge: "/images/icon.png",
      data,
    });

    const results = [];

    for (const document of subscriptions.documents) {
      try {
        const subscription = JSON.parse(document.subscription);

        await webpush.sendNotification(
          subscription,
          notificationPayload,
        );

        results.push({
          success: true,
          subscriptionId: document.$id,
        });
      } catch (error) {
        const statusCode = getPushStatusCode(error);

        console.error(
          `Push delivery failed for ${document.$id}:`,
          error,
        );

        if (statusCode === 404 || statusCode === 410) {
          await databases
            .updateDocument({
              databaseId: environment.databaseId,
              collectionId: environment.collectionId,
              documentId: document.$id,
              data: { isActive: false },
            })
            .catch((updateError) => {
              console.error(
                `Unable to deactivate subscription ${document.$id}:`,
                updateError,
              );
            });
        }

        results.push({
          success: false,
          subscriptionId: document.$id,
          statusCode,
          error: getErrorMessage(error),
        });
      }
    }

    const sent = results.filter((result) => result.success).length;

    return NextResponse.json(
      {
        success: sent > 0,
        sent,
        failed: results.length - sent,
        total: results.length,
        results,
      },
      { status: sent > 0 ? 200 : 502 },
    );
  } catch (error) {
    console.error("Error sending push notification:", error);

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
