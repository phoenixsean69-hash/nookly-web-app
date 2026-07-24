"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { account, databases } from "@/lib/appwrite/config";
import { Query } from "appwrite";
import { Models, ID } from "appwrite";
import { useRouter } from "next/navigation";
import { Organization } from "@/types/organization";
import { cacheService } from "@/lib/cache.service";
import { CACHE_KEYS } from "@/lib/cache-keys";
import toast from 'react-hot-toast';

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

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const organizationsCollectionId =
  process.env.NEXT_PUBLIC_APPWRITE_ORGANIZATIONS_COLLECTION_ID!;
const usersCollectionId =
  process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!; 

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const router = useRouter();

  // Check online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Only refresh cache if we have a user and are coming back online
      if (user && !isOffline) {
        refreshCache().catch(() => {});
      }
    };
    
    const handleOffline = () => {
      setIsOffline(true);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user, isOffline]);

  // Load cached data on mount
  useEffect(() => {
    const loadCachedData = () => {
      const cachedUser = cacheService.get<Models.User<Models.Preferences>>(CACHE_KEYS.USER);
      const cachedOrg = cacheService.get<Organization>(CACHE_KEYS.ORGANIZATION);
      
      if (cachedUser) {
        setUser(cachedUser);
        console.log('📦 Loaded user from cache');
      }
      
      if (cachedOrg) {
        setOrganization(cachedOrg);
        console.log('📦 Loaded organization from cache');
      }
    };
    
    loadCachedData();
  }, []);

  const checkUser = async () => {
    // Skip if offline
    if (!navigator.onLine) {
      console.log('📴 Offline - skipping auth check, using cached data if available');
      // If we have cached user data, keep it
      const cachedUser = cacheService.get<Models.User<Models.Preferences>>(CACHE_KEYS.USER);
      const cachedOrg = cacheService.get<Organization>(CACHE_KEYS.ORGANIZATION);
      
      if (cachedUser && cachedOrg) {
        setUser(cachedUser);
        setOrganization(cachedOrg);
        setIsOffline(true);
      }
      setLoading(false);
      return;
    }

    try {
      // Try to get user from Appwrite
      const currentUser = await account.get();
      setUser(currentUser);
      
      // Cache user data
      cacheService.set(CACHE_KEYS.USER, currentUser, 30 * 60 * 1000);

      // Fetch organization data for this user
      if (currentUser) {
        const organizations = await databases.listDocuments(
          databaseId,
          organizationsCollectionId,
          [Query.equal("userId", currentUser.$id)],
        );

        if (organizations.documents.length > 0) {
          const org = organizations.documents[0] as unknown as Organization;
          setOrganization(org);
          
          // Cache organization data
          cacheService.set(CACHE_KEYS.ORGANIZATION, org, 30 * 60 * 1000);
        }
      }
    } catch (error) {
      console.log('⚠️ Auth check failed, using cached data if available');
      // Try to use cached data on error
      const cachedUser = cacheService.get<Models.User<Models.Preferences>>(CACHE_KEYS.USER);
      const cachedOrg = cacheService.get<Organization>(CACHE_KEYS.ORGANIZATION);
      
      if (cachedUser && cachedOrg) {
        setUser(cachedUser);
        setOrganization(cachedOrg);
        console.log('📦 Using cached auth data');
      } else {
        // No cached data, user is not authenticated
        setUser(null);
        setOrganization(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      // First, check if we have cached user data
      const cachedUser = cacheService.get<Models.User<Models.Preferences>>(CACHE_KEYS.USER);
      const cachedOrg = cacheService.get<Organization>(CACHE_KEYS.ORGANIZATION);
      
      // If we have cached data, set it immediately (this allows offline access)
      if (cachedUser && cachedOrg) {
        setUser(cachedUser);
        setOrganization(cachedOrg);
        console.log('📦 Using cached auth data for initial load');
        
        // If offline, we're done
        if (!navigator.onLine) {
          setIsOffline(true);
          setLoading(false);
          return;
        }
      }
      
      // If online, try to refresh from server
      if (navigator.onLine) {
        await checkUser();
      } else {
        // Offline and no cached data
        setLoading(false);
        setIsOffline(true);
      }
    };
    
    initAuth();
  }, []);

  const refreshCache = async () => {
    // Check if offline
    if (!navigator.onLine) {
      console.log('📴 Cannot refresh cache while offline');
      toast.error('Cannot refresh while offline', { id: 'cache-refresh' });
      return;
    }
    
    try {
      toast.loading('Refreshing cache...', { id: 'cache-refresh' });
      
      const currentUser = await account.get();
      setUser(currentUser);
      cacheService.set(CACHE_KEYS.USER, currentUser, 30 * 60 * 1000);
      
      const organizations = await databases.listDocuments(
        databaseId,
        organizationsCollectionId,
        [Query.equal("userId", currentUser.$id)],
      );
      
      if (organizations.documents.length > 0) {
        const org = organizations.documents[0] as unknown as Organization;
        setOrganization(org);
        cacheService.set(CACHE_KEYS.ORGANIZATION, org, 30 * 60 * 1000);
      }
      
      toast.success('Cache refreshed!', { id: 'cache-refresh' });
      console.log('✅ Cache refreshed successfully');
      
      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('cacheRefreshed'));
    } catch (error) {
      console.error('❌ Error refreshing cache:', error);
      toast.error('Failed to refresh cache', { id: 'cache-refresh' });
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      await account.createEmailPasswordSession(email, password);
      const currentUser = await account.get();
      setUser(currentUser);
      cacheService.set(CACHE_KEYS.USER, currentUser, 30 * 60 * 1000);

      const organizations = await databases.listDocuments(
        databaseId,
        organizationsCollectionId,
        [Query.equal("userId", currentUser.$id)],
      );

      if (organizations.documents.length > 0) {
        const org = organizations.documents[0] as unknown as Organization;
        setOrganization(org);
        cacheService.set(CACHE_KEYS.ORGANIZATION, org, 30 * 60 * 1000);
      }

      router.push("/dashboard");
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await account.deleteSession("current");
      setUser(null);
      setOrganization(null);
      
      // Hybrid approach - clear auth data but keep content
      cacheService.remove(CACHE_KEYS.USER);
      cacheService.remove(CACHE_KEYS.ORGANIZATION);
      cacheService.remove(CACHE_KEYS.AUTH_STATE);
      
      console.log('🔵 Logged out - Auth data cleared, content data preserved');
      
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      setUser(null);
      setOrganization(null);
      cacheService.remove(CACHE_KEYS.USER);
      cacheService.remove(CACHE_KEYS.ORGANIZATION);
      cacheService.remove(CACHE_KEYS.AUTH_STATE);
    }
  };


  const register = async (data: RegisterData) => {
    try {
      console.log("📝 Starting registration process...");
      
      // Create user with username
      const newUser = await account.create(
        ID.unique(),
        data.email,
        data.password,
        data.name,
      );

      await account.createEmailPasswordSession(data.email, data.password);

      const organizationData = await databases.createDocument(
        databaseId,
        organizationsCollectionId,
        ID.unique(),
        {
          name: data.name,
          username: data.username,
          email: data.email,
          phone: data.phone,
          avatar: data.avatar || "",
          city: data.city,
          avatarFileId: data.avatarFileId || "",
          type_of: data.type_of,
          properties: 0,
          userId: newUser.$id,
          isActive: true,
          subscriptionTier: "free",
        },
      );

      const org = organizationData as unknown as Organization;
      setOrganization(org);
      setUser(newUser);
      
      // Add user to users table
      const userData = await databases.createDocument(
        databaseId,
        usersCollectionId, // Make sure this is your users collection ID
        newUser.$id, // Using the user's ID as the document ID
        {
          userId: newUser.$id,
          name: data.name,
          email: data.email,
          username: data.username,
          phone: data.phone,
          avatar: data.avatar || "",
          userMode: "organization",
          organizationId: organizationData.$id,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      );
      
      cacheService.set(CACHE_KEYS.USER, newUser, 30 * 60 * 1000);
      cacheService.set(CACHE_KEYS.ORGANIZATION, org, 30 * 60 * 1000);

      await account.updatePrefs({
        organizationId: organizationData.$id,
        username: data.username,
        phone: data.phone,
        userMode: "organization",
      });
      
      router.replace("/dashboard");
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{ 
        user, 
        organization, 
        loading, 
        isOffline, 
        login, 
        logout, 
        register, 
        refreshCache 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}