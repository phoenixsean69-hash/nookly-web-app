import { NextResponse } from "next/server";
import {
  Client,
  Databases,
  ID,
  Query,
} from "node-appwrite";

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

  const missing = [];

  if (!endpoint) missing.push("NEXT_PUBLIC_APPWRITE_ENDPOINT");
  if (!projectId) missing.push("NEXT_PUBLIC_APPWRITE_PROJECT_ID");
  if (!apiKey) missing.push("APPWRITE_API_KEY");
  if (!databaseId) {
    missing.push("NEXT_PUBLIC_APPWRITE_DATABASE_ID");
  }

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
  };
}

function createServerDatabase(environment) {
  const client = new Client()
    .setEndpoint(environment.endpoint)
    .setProject(environment.projectId)
    .setKey(environment.apiKey);

  return new Databases(client);
}

function isPushSubscription(subscription) {
  return Boolean(
    subscription &&
      typeof subscription === "object" &&
      typeof subscription.endpoint === "string" &&
      subscription.endpoint.trim() &&
      subscription.keys &&
      typeof subscription.keys === "object" &&
      typeof subscription.keys.p256dh === "string" &&
      typeof subscription.keys.auth === "string",
  );
}

function parseSubscription(value) {
  if (typeof value !== "string") return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getErrorMessage(error) {
  return error instanceof Error
    ? error.message
    : "Unknown subscription error";
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
    const subscription = payload.subscription;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "userId is required.",
        },
        { status: 400 },
      );
    }

    if (!isPushSubscription(subscription)) {
      return NextResponse.json(
        {
          success: false,
          error: "A valid push subscription is required.",
        },
        { status: 400 },
      );
    }

    const subscriptionJson = JSON.stringify(subscription);

    const existingSubscriptions =
      await databases.listDocuments({
        databaseId: environment.databaseId,
        collectionId: environment.collectionId,
        queries: [
          Query.equal("userId", userId),
          Query.limit(100),
        ],
        total: true,
        ttl: 0,
      });

    const existingDocument =
      existingSubscriptions.documents.find((document) => {
        const savedSubscription = parseSubscription(
          document.subscription,
        );

        return (
          savedSubscription?.endpoint === subscription.endpoint
        );
      });

    if (existingDocument) {
      await databases.updateDocument({
        databaseId: environment.databaseId,
        collectionId: environment.collectionId,
        documentId: existingDocument.$id,
        data: {
          subscription: subscriptionJson,
          isActive: true,
        },
      });

      return NextResponse.json({
        success: true,
        created: false,
        subscriptionId: existingDocument.$id,
      });
    }

    const createdDocument = await databases.createDocument({
      databaseId: environment.databaseId,
      collectionId: environment.collectionId,
      documentId: ID.unique(),
      data: {
        userId,
        subscription: subscriptionJson,
        createdAt: new Date().toISOString(),
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        created: true,
        subscriptionId: createdDocument.$id,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error saving push subscription:", error);

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
