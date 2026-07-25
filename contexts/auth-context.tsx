"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ID, Models, Query } from "appwrite";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { account, databases } from "@/lib/appwrite/config";
import { cacheService } from "@/lib/cache.service";
import { CACHE_KEYS } from "@/lib/cache-keys";
import type { Organization } from "@/types/organization";

interface RegisterData {
  name: string;
  username: string;
  city: string;
  email: string;
  password: string;
  phone: string;
  avatar?: string;
  avatarFileId?: string;
  type_of: string;
}

interface AuthContextType {
  user: Models.User<Models.Preferences> | null;
  organization: Organization | null;
  loading: boolean;
  isOffline: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  refreshCache: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const organizationsCollectionId =
  process.env.NEXT_PUBLIC_APPWRITE_ORGANIZATIONS_COLLECTION_ID!;
const usersCollectionId =
  process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!;

const AUTH_CACHE_DURATION = 30 * 60 * 1000;

function getCachedSession(): {
  user: Models.User<Models.Preferences>;
  organization: Organization;
} | null {
  const user =
    cacheService.get<Models.User<Models.Preferences>>(CACHE_KEYS.USER);
  const organization =
    cacheService.get<Organization>(CACHE_KEYS.ORGANIZATION);

  if (!user || !organization || organization.userId !== user.$id) {
    return null;
  }

  return { user, organization };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] =
    useState<Models.User<Models.Preferences> | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  const persistSession = useCallback(
    (
      nextUser: Models.User<Models.Preferences>,
      nextOrganization: Organization,
    ) => {
      setUser(nextUser);
      setOrganization(nextOrganization);
      cacheService.set(CACHE_KEYS.USER, nextUser, AUTH_CACHE_DURATION);
      cacheService.set(
        CACHE_KEYS.ORGANIZATION,
        nextOrganization,
        AUTH_CACHE_DURATION,
      );
    },
    [],
  );

  const clearLocalSession = useCallback(() => {
    setUser(null);
    setOrganization(null);
    cacheService.clearAll();
  }, []);

  const loadOrganization = useCallback(
    async (userId: string): Promise<Organization | null> => {
      const response = await databases.listDocuments(
        databaseId,
        organizationsCollectionId,
        [Query.equal("userId", userId), Query.limit(1)],
      );

      return (response.documents[0] as unknown as Organization | undefined) ??
        null;
    },
    [],
  );

  const refreshSession = useCallback(async () => {
    const currentUser = await account.get();
    const cachedUser =
      cacheService.get<Models.User<Models.Preferences>>(CACHE_KEYS.USER);

    if (cachedUser && cachedUser.$id !== currentUser.$id) {
      cacheService.clearAll();
    }

    const currentOrganization = await loadOrganization(currentUser.$id);

    if (!currentOrganization || !currentOrganization.isActive) {
      clearLocalSession();
      throw new Error(
        "This account does not have an active Nookly organization.",
      );
    }

    persistSession(currentUser, currentOrganization);
  }, [clearLocalSession, loadOrganization, persistSession]);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      const cachedSession = getCachedSession();

      if (cachedSession && mounted) {
        setUser(cachedSession.user);
        setOrganization(cachedSession.organization);
      }

      if (!navigator.onLine) {
        if (mounted) {
          setIsOffline(true);
          setLoading(false);
        }
        return;
      }

      try {
        await refreshSession();
      } catch {
        if (!cachedSession) {
          clearLocalSession();
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void initialize();

    return () => {
      mounted = false;
    };
  }, [clearLocalSession, refreshSession]);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);

    const handleOnline = () => {
      setIsOffline(false);

      if (user) {
        void refreshSession()
          .then(() => {
            window.dispatchEvent(new CustomEvent("cacheRefreshed"));
          })
          .catch((error) => {
            console.error("Failed to refresh the session:", error);
          });
      }
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [refreshSession, user]);

  const refreshCache = useCallback(async () => {
    if (!navigator.onLine) {
      toast.error("Cannot refresh while offline.", { id: "cache-refresh" });
      return;
    }

    toast.loading("Refreshing data...", { id: "cache-refresh" });

    try {
      await refreshSession();
      window.dispatchEvent(new CustomEvent("cacheRefreshed"));
      toast.success("Data refreshed.", { id: "cache-refresh" });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to refresh data.",
        { id: "cache-refresh" },
      );
      throw error;
    }
  }, [refreshSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      cacheService.clearAll();

      try {
        await account.createEmailPasswordSession(email.trim(), password);
        await refreshSession();
        router.replace("/dashboard");
      } catch (error) {
        try {
          await account.deleteSession("current");
        } catch {
          // There may be no active session to delete.
        }

        clearLocalSession();
        throw error;
      }
    },
    [clearLocalSession, refreshSession, router],
  );

  const logout = useCallback(async () => {
    try {
      if (navigator.onLine) {
        await account.deleteSession("current");
      }
    } catch (error) {
      console.error("Appwrite logout failed:", error);
    } finally {
      clearLocalSession();
      router.replace("/login");
    }
  }, [clearLocalSession, router]);

  const register = useCallback(
    async (data: RegisterData) => {
      cacheService.clearAll();

      const newUser = await account.create(
        ID.unique(),
        data.email.trim(),
        data.password,
        data.name.trim(),
      );

      await account.createEmailPasswordSession(
        data.email.trim(),
        data.password,
      );

      const organizationDocument = await databases.createDocument(
        databaseId,
        organizationsCollectionId,
        ID.unique(),
        {
          name: data.name.trim(),
          username: data.username.trim(),
          city: data.city.trim(),
          email: data.email.trim(),
          phone: data.phone.trim(),
          avatar: data.avatar ?? "",
          avatarFileId: data.avatarFileId ?? "",
          type_of: data.type_of,
          properties: 0,
          userId: newUser.$id,
          isActive: true,
          subscriptionTier: "free",
        },
      );

      await databases.createDocument(
        databaseId,
        usersCollectionId,
        newUser.$id,
        {
          userId: newUser.$id,
          name: data.name.trim(),
          email: data.email.trim(),
          username: data.username.trim(),
          phone: data.phone.trim(),
          avatar: data.avatar ?? "",
          userMode: "organization",
          organizationId: organizationDocument.$id,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      );

      await account.updatePrefs({
        organizationId: organizationDocument.$id,
        username: data.username.trim(),
        phone: data.phone.trim(),
        userMode: "organization",
      });

      const currentUser = await account.get();
      const currentOrganization =
        organizationDocument as unknown as Organization;

      persistSession(currentUser, currentOrganization);
      router.replace("/dashboard");
    },
    [persistSession, router],
  );

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      organization,
      loading,
      isOffline,
      login,
      logout,
      register,
      refreshCache,
    }),
    [
      user,
      organization,
      loading,
      isOffline,
      login,
      logout,
      register,
      refreshCache,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
