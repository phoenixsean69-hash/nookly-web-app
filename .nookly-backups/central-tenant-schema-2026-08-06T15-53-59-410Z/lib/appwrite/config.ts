"use client";

import {
  Account as AppwriteAccount,
  Client,
  Databases as AppwriteDatabases,
  Models,
  Realtime as AppwriteRealtime,
  Storage as AppwriteStorage,
} from "appwrite";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

if (!endpoint) {
  throw new Error("NEXT_PUBLIC_APPWRITE_ENDPOINT is not configured.");
}

if (!projectId) {
  throw new Error("NEXT_PUBLIC_APPWRITE_PROJECT_ID is not configured.");
}

const rawClient = new Client().setEndpoint(endpoint).setProject(projectId);
const rawAccount = new AppwriteAccount(rawClient);
const rawDatabases = new AppwriteDatabases(rawClient);
const rawStorage = new AppwriteStorage(rawClient);
const rawRealtime = new AppwriteRealtime(rawClient);

type JsonData = Record<string, unknown>;
type RealtimeCallback<T> = (event: T) => void;

/**
 * The project was originally written against Appwrite's positional SDK API.
 * Appwrite 26 uses object arguments. These adapters preserve the existing
 * project API while calling the installed SDK correctly.
 */
class AccountAdapter {
  get() {
    return rawAccount.get();
  }

  getPrefs() {
    return rawAccount.getPrefs();
  }

  create(userId: string, email: string, password: string, name?: string) {
    return rawAccount.create({ userId, email, password, name });
  }

  createEmailPasswordSession(email: string, password: string) {
    return rawAccount.createEmailPasswordSession({ email, password });
  }

  createRecovery(email: string, url: string) {
    return rawAccount.createRecovery({ email, url });
  }

  updateRecovery(
    userId: string,
    secret: string,
    password: string,
    _passwordAgain?: string,
  ) {
    return rawAccount.updateRecovery({
      userId,
      secret,
      password,
    });
  }

  updateName(name: string) {
    return rawAccount.updateName({ name });
  }

  updateEmail(email: string, password: string) {
    return rawAccount.updateEmail({ email, password });
  }

  updatePhone(phone: string, password: string) {
    return rawAccount.updatePhone({ phone, password });
  }

  updatePassword(password: string, oldPassword?: string) {
    return rawAccount.updatePassword({ password, oldPassword });
  }

  updatePrefs(prefs: Models.Preferences) {
    return rawAccount.updatePrefs({ prefs });
  }

  getSession(sessionId: string) {
    return rawAccount.getSession({ sessionId });
  }

  listSessions() {
    return rawAccount.listSessions();
  }

  deleteSession(sessionId: string) {
    return rawAccount.deleteSession({ sessionId });
  }

  deleteSessions() {
    return rawAccount.deleteSessions();
  }
}

class DatabasesAdapter {
  listDocuments(
    databaseId: string,
    collectionId: string,
    queries: string[] = [],
  ) {
    return rawDatabases.listDocuments({
      databaseId,
      collectionId,
      queries,
    });
  }

  getDocument(
    databaseId: string,
    collectionId: string,
    documentId: string,
    queries: string[] = [],
  ) {
    return rawDatabases.getDocument({
      databaseId,
      collectionId,
      documentId,
      queries,
    });
  }

  createDocument(
    databaseId: string,
    collectionId: string,
    documentId: string,
    data: JsonData,
    permissions?: string[],
  ) {
    return rawDatabases.createDocument({
      databaseId,
      collectionId,
      documentId,
      data,
      permissions,
    });
  }

  updateDocument(
    databaseId: string,
    collectionId: string,
    documentId: string,
    data: JsonData,
    permissions?: string[],
  ) {
    return rawDatabases.updateDocument({
      databaseId,
      collectionId,
      documentId,
      data,
      permissions,
    });
  }

  deleteDocument(
    databaseId: string,
    collectionId: string,
    documentId: string,
  ) {
    return rawDatabases.deleteDocument({
      databaseId,
      collectionId,
      documentId,
    });
  }
}

class StorageAdapter {
  createFile(
    bucketId: string,
    fileId: string,
    file: File,
    permissions?: string[],
  ) {
    return rawStorage.createFile({
      bucketId,
      fileId,
      file,
      permissions,
    });
  }

  getFile(bucketId: string, fileId: string) {
    return rawStorage.getFile({ bucketId, fileId });
  }

  getFileView(bucketId: string, fileId: string, token?: string) {
    return rawStorage.getFileView({ bucketId, fileId, token });
  }

  getFileDownload(bucketId: string, fileId: string, token?: string) {
    return rawStorage.getFileDownload({ bucketId, fileId, token });
  }

  listFiles(bucketId: string, queries: string[] = [], search?: string) {
    return rawStorage.listFiles({ bucketId, queries, search });
  }

  deleteFile(bucketId: string, fileId: string) {
    return rawStorage.deleteFile({ bucketId, fileId });
  }
}

export const account = new AccountAdapter();
export const databases = new DatabasesAdapter();
export const storage = new StorageAdapter();

const client = {
  subscribe<T>(
    channels: string | string[],
    callback: RealtimeCallback<T>,
  ): () => void {
    let active = true;
    let subscription: { unsubscribe: () => Promise<void> | void } | null =
      null;

    const subscribe = rawRealtime.subscribe.bind(rawRealtime) as unknown as (
      selectedChannels: string | string[],
      selectedCallback: RealtimeCallback<T>,
    ) => Promise<{ unsubscribe: () => Promise<void> | void }>;

    void subscribe(channels, callback)
      .then((nextSubscription) => {
        if (!active) {
          void nextSubscription.unsubscribe();
          return;
        }

        subscription = nextSubscription;
      })
      .catch((error) => {
        console.error(
          "Unable to start Appwrite realtime subscription:",
          error,
        );
      });

    return () => {
      active = false;

      if (subscription) {
        void subscription.unsubscribe();
      }
    };
  },
};

export { rawClient, rawAccount, rawDatabases, rawStorage, rawRealtime };
export default client;