"use client";

import { updateOrganizationPropertyCount } from "@/lib/appwrite/helpers";
import { cacheService } from "@/lib/cache.service";
import { useRouter } from "next/navigation";
import { CACHE_KEYS } from "@/lib/cache-keys";
import { ProtectedRoute } from "@/components/protected-route";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { useEffect, useState, useCallback } from "react";
import { Query } from "appwrite";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import Link from "next/link";
import Image from "next/image";
import { databases } from "@/lib/appwrite/config";
import { Property } from "@/types/property";
import { StatsCard } from "@/components/dashboard/stats-card";
import {
  Home,
  Building2,
  TrendingUp,
  Users,
  DollarSign,
  MessageCircle,
  PlusCircle,
  ArrowRight,
  CheckCircle,
  Clock,
  ChevronRight,
  Calendar,
  Star,
  Eye,
  Activity,
  BarChart3,
  Zap,
  Target,
  Award,
  Sparkles,
  FileText,
  Wrench,
  LayoutDashboard,
  RefreshCw,
  TrendingDown,
  TrendingUp as TrendingUpIcon,
  Heart,
  Share2,
} from "lucide-react";

// Interface for historical stats stored in cache
interface HistoricalStats {
  date: string;
  totalProperties: number;
  activeListings: number;
  occupiedListings: number; // ← ADD THIS
  totalViews: number;
  monthlyRevenue: number;
  occupancyRate: number;
  responseRate: number; // ← ADD THIS
  satisfactionScore: number; // ← ADD THIS
}

interface DashboardStats {
  totalProperties: number;
  occupiedListings: number; 
  activeListings: number;
  totalTenants: number;
  monthlyRevenue: number;
  totalViews: number;
  occupancyRate: number;
  responseRate: number;
  satisfactionScore: number;
}

interface StatTrend {
  value: string;
  isUp: boolean;
}

interface RecentActivity {
  id: string;
  action: string;
  property: string;
  propertyId: string;
  time: string;
  timestamp: Date;
  icon: any;
  type: "view" | "like" | "request" | "review";
}

interface Task {
  $id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in-progress" | "completed";
  dueDate: string;
  propertyId?: string;
  propertyName?: string;
}

// Cache key for historical stats
const HISTORICAL_STATS_KEY = 'dashboard_historical_stats';

export default function DashboardPage() {
  const { organization, isOffline } = useAuth();
  const { resolvedTheme } = useTheme();
  const [stats, setStats] = useState<DashboardStats>({
  totalProperties: 0,
  activeListings: 0,
  occupiedListings: 0, 
  totalTenants: 0,
  monthlyRevenue: 0,
  totalViews: 0,
  occupancyRate: 0,
  responseRate: 0,
  satisfactionScore: 0,
});
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [requestsByProperty, setRequestsByProperty] = useState<{ [key: string]: any[] }>({});
  const [trends, setTrends] = useState<Record<string, StatTrend>>({});
  const [recentProperties, setRecentProperties] = useState<Property[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [historicalStats, setHistoricalStats] = useState<HistoricalStats | null>(null);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Function to check sidebar state from localStorage
  const checkSidebarState = useCallback(() => {
    if (isMobile) {
      const mobileState = sessionStorage.getItem('mobileSidebarOpen');
      setIsMobileOpen(mobileState === 'true');
      return;
    }
    const savedState = localStorage.getItem('sidebarCollapsed');
    setIsSidebarCollapsed(savedState === 'true');
  }, [isMobile]);

  // Listen for sidebar state changes
  useEffect(() => {
    checkSidebarState();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'sidebarCollapsed') {
        setIsSidebarCollapsed(e.newValue === 'true');
      }
    };

    const handleCustomEvent = (e: CustomEvent) => {
      if (e.detail?.isCollapsed !== undefined) {
        setIsSidebarCollapsed(e.detail.isCollapsed);
      } else {
        checkSidebarState();
      }
    };

    const handleMobileToggle = (e: CustomEvent) => {
      if (e.detail?.isOpen !== undefined) {
        setIsMobileOpen(e.detail.isOpen);
        sessionStorage.setItem('mobileSidebarOpen', String(e.detail.isOpen));
      } else {
        checkSidebarState();
      }
    };

    const handleFocus = () => {
      checkSidebarState();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('sidebarToggle', handleCustomEvent as EventListener);
    window.addEventListener('mobileSidebarToggle', handleMobileToggle as EventListener);
    window.addEventListener('focus', handleFocus);

    const interval = setInterval(() => {
      if (isMobile) {
        const mobileState = sessionStorage.getItem('mobileSidebarOpen');
        setIsMobileOpen(mobileState === 'true');
      } else {
        const savedState = localStorage.getItem('sidebarCollapsed');
        const isCollapsed = savedState === 'true';
        setIsSidebarCollapsed(prev => {
          if (prev !== isCollapsed) {
            return isCollapsed;
          }
          return prev;
        });
      }
    }, 100);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('sidebarToggle', handleCustomEvent as EventListener);
      window.removeEventListener('mobileSidebarToggle', handleMobileToggle as EventListener);
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [checkSidebarState, isMobile]);

  // Helper function to format relative time - cleaner version
  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) {
      return `${diffMins}m ago`;
    }
    if (diffHours < 24) {
      const remainingMins = diffMins % 60;
      if (remainingMins === 0) {
        return `${diffHours}h ago`;
      }
      return `${diffHours}h ${remainingMins}m ago`;
    }
    if (diffDays < 7) {
      return `${diffDays}d ago`;
    }
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      year: diffDays > 365 ? 'numeric' : undefined
    });
  };

  // Format due date for display
  const formatDueDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    }
    return date.toLocaleDateString();
  };

  // Check if task is overdue
  const isOverdue = (dueDate: string): boolean => {
    const date = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  // Calculate percentage change between current and previous values
  const calculateTrend = (current: number, previous: number): StatTrend => {
    if (previous === 0 && current === 0) {
      return { value: "0%", isUp: true };
    }
    if (previous === 0) {
      return { value: "+100%", isUp: true };
    }
    const change = ((current - previous) / previous) * 100;
    const rounded = Math.round(change);
    return {
      value: change >= 0 ? `+${rounded}%` : `${rounded}%`,
      isUp: change >= 0,
    };
  };

  // Save current stats as historical data
const saveHistoricalStats = (currentStats: DashboardStats) => {
  const historicalData: HistoricalStats = {
    date: new Date().toISOString(),
    totalProperties: currentStats.totalProperties,
    activeListings: currentStats.activeListings,
    occupiedListings: currentStats.occupiedListings, // ← ADD THIS
    totalViews: currentStats.totalViews,
    monthlyRevenue: currentStats.monthlyRevenue,
    occupancyRate: currentStats.occupancyRate,
    responseRate: currentStats.responseRate, // ← ADD THIS
    satisfactionScore: currentStats.satisfactionScore, // ← ADD THIS
  };
  
  cacheService.set(HISTORICAL_STATS_KEY, historicalData, 30 * 24 * 60 * 60 * 1000);
  setHistoricalStats(historicalData);
};

  // Load historical stats from cache
  const loadHistoricalStats = (): HistoricalStats | null => {
    return cacheService.get<HistoricalStats>(HISTORICAL_STATS_KEY) || null;
  };

  // Function to process and set dashboard data from properties

const processPropertiesData = (allProperties: Property[], tasks: Task[] = [], allRequests: any[] = []) => {
  setAllProperties(allProperties);
  
  const properties = allProperties.slice(0, 5);
  setRecentProperties(properties);

  const requestsByProperty: { [key: string]: any[] } = {};
  allRequests.forEach((req) => {
    const propertyId = req.propertyId;
    if (!requestsByProperty[propertyId]) {
      requestsByProperty[propertyId] = [];
    }
    requestsByProperty[propertyId].push(req);
  });
  setRequestsByProperty(requestsByProperty);
  
  const pendingTasks = tasks
    .filter(task => task.status !== "completed")
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 6);
  
  setUpcomingTasks(pendingTasks);

  const total = allProperties.length;
  const active = allProperties.filter((p: Property) => p.isAvailable === true).length;
  const occupied = total - active;
  const totalViews = allProperties.reduce((sum, p) => sum + (p.views || 0), 0);
  const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;
  const totalTenants = allProperties.reduce((sum, p) => sum + (p.roomFor || 0), 0);
  
  // 🔥 FIX: Revenue only from occupied properties
  const monthlyRevenue = allProperties
    .filter((p: Property) => p.isAvailable === false)
    .reduce((sum, p) => sum + (p.price || 0), 0);
  
  // -------- CALCULATE RESPONSE RATE --------
  let responseRate = 100;
  let totalWeightedScore = 0;
  let totalRequestCount = 0;
  
  allProperties.forEach((p: Property) => {
    const propertyRequests = requestsByProperty[p.$id] || [];
    const requestCount = propertyRequests.length;
    
    if (requestCount > 0) {
      const earliestRequest = propertyRequests.reduce((earliest, current) => {
        const currentDate = new Date(current.$createdAt);
        return currentDate < earliest ? currentDate : earliest;
      }, new Date(propertyRequests[0].$createdAt));
      
      const createdAt = new Date(p.$createdAt);
      const timeDiffMs = earliestRequest.getTime() - createdAt.getTime();
      const timeDiffDays = timeDiffMs / (1000 * 60 * 60 * 24);
      
      let score = 0;
      if (timeDiffDays <= 1) {
        score = 100;
      } else if (timeDiffDays <= 3) {
        score = 90;
      } else if (timeDiffDays <= 7) {
        score = 80;
      } else if (timeDiffDays <= 14) {
        score = 70;
      } else if (timeDiffDays <= 30) {
        score = 60;
      } else if (timeDiffDays <= 60) {
        score = 40;
      } else {
        score = 20;
      }
      
      totalWeightedScore += score * requestCount;
      totalRequestCount += requestCount;
    }
  });
  
  if (totalRequestCount > 0) {
    responseRate = Math.round(totalWeightedScore / totalRequestCount);
  }
  
  // -------- CALCULATE SATISFACTION SCORE --------
  let satisfactionScore = 4.5;
  let totalScore = 0;
  let scoredPropertiesForSatisfaction = 0;
  
  allProperties.forEach((p: Property) => {
    const propertyRequests = requestsByProperty[p.$id] || [];
    const requestCount = propertyRequests.length;
    const viewCount = p.views || 0;
    
    if (viewCount > 0) {
      const viewToRequestRatio = requestCount / viewCount;
      
      let score = 0;
      if (viewToRequestRatio > 0.5) {
        score = 5.0;
      } else if (viewToRequestRatio > 0.3) {
        score = 4.5;
      } else if (viewToRequestRatio > 0.15) {
        score = 4.0;
      } else if (viewToRequestRatio > 0.05) {
        score = 3.5;
      } else if (viewToRequestRatio > 0) {
        score = 3.0;
      } else {
        score = Math.max(2.0, 3.0 - (viewCount / 1000));
      }
      
      totalScore += score;
      scoredPropertiesForSatisfaction++;
    }
  });
  
  if (scoredPropertiesForSatisfaction > 0) {
    satisfactionScore = Math.round((totalScore / scoredPropertiesForSatisfaction) * 10) / 10;
  }

  const currentStats: DashboardStats = {
    totalProperties: total,
    activeListings: active,
    occupiedListings: occupied,
    totalTenants: totalTenants,
    monthlyRevenue: monthlyRevenue,
    totalViews: totalViews,
    occupancyRate: occupancyRate,
    responseRate: responseRate,
    satisfactionScore: satisfactionScore,
  };

  const prevStats = loadHistoricalStats();

  const calculatedTrends: Record<string, StatTrend> = {
    totalProperties: calculateTrend(currentStats.totalProperties, prevStats?.totalProperties || 0),
    activeListings: calculateTrend(currentStats.activeListings, prevStats?.activeListings || 0),
    occupiedListings: calculateTrend(currentStats.occupiedListings, prevStats?.occupiedListings || 0),
    monthlyRevenue: calculateTrend(currentStats.monthlyRevenue, prevStats?.monthlyRevenue || 0),
    totalViews: calculateTrend(currentStats.totalViews, prevStats?.totalViews || 0),
    occupancyRate: calculateTrend(currentStats.occupancyRate, prevStats?.occupancyRate || 0),
    responseRate: calculateTrend(currentStats.responseRate, prevStats?.responseRate || 0),
    satisfactionScore: calculateTrend(currentStats.satisfactionScore, prevStats?.satisfactionScore || 0),
  };
  
  setTrends(calculatedTrends);
  setStats(currentStats);
  saveHistoricalStats(currentStats);
  
  // Generate activities
  const activities: RecentActivity[] = [];
  
  allProperties.forEach((property) => {
    const baseDate = new Date(property.$updatedAt || property.$createdAt);
    
    if (property.views && property.views > 0) {
      const viewDate = new Date(baseDate);
      activities.push({
        id: `${property.$id}-view-${Date.now()}`,
        action: `new view`,
        property: property.propertyName,
        propertyId: property.$id,
        time: formatRelativeTime(viewDate),
        timestamp: viewDate,
        icon: Eye,
        type: "view",
      });
    }
    
    if (property.likes && property.likes > 0) {
      const likeDate = new Date(baseDate);
      likeDate.setMinutes(likeDate.getMinutes() - 3);
      activities.push({
        id: `${property.$id}-like-${Date.now()}`,
        action: `new like`,
        property: property.propertyName,
        propertyId: property.$id,
        time: formatRelativeTime(likeDate),
        timestamp: likeDate,
        icon: Heart,
        type: "like",
      });
    }
    
    if (property.requests && property.requests > 0) {
      const requestDate = new Date(baseDate);
      requestDate.setMinutes(requestDate.getMinutes() - 6);
      activities.push({
        id: `${property.$id}-request-${Date.now()}`,
        action: `new inquiry`,
        property: property.propertyName,
        propertyId: property.$id,
        time: formatRelativeTime(requestDate),
        timestamp: requestDate,
        icon: MessageCircle,
        type: "request",
      });
    }
  });

  const sortedActivities = activities
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 4);
  
  setRecentActivities(sortedActivities);
  setLastUpdated(new Date());
};

  // Function to fetch fresh data from server
  const fetchDashboardData = async () => {
    if (!navigator.onLine) {
      console.log('📴 Offline - using cached dashboard data');
      const cachedProperties = cacheService.get<Property[]>(CACHE_KEYS.PROPERTIES);
      const cachedTasks = cacheService.get<Task[]>(CACHE_KEYS.TASKS);
      const cachedRequests = cacheService.get<any[]>(CACHE_KEYS.REQUESTS);
      
      if (cachedProperties) {
        processPropertiesData(cachedProperties, cachedTasks || [], cachedRequests || []);
      }
      setIsLoading(false);
      return;
    }

    try {
      if (!organization?.userId) {
        setIsLoading(false);
        return;
      }

      const propertiesResponse = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID!,
        [
          Query.equal("creatorId", organization.userId),
          Query.orderDesc("$createdAt"),
        ],
      );

      const tasksResponse = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_TASKS_COLLECTION_ID!,
        [
          Query.equal("organizationId", organization.$id),
          Query.orderAsc("dueDate"),
          Query.limit(20),
        ],
      );

      const propertyIds = propertiesResponse.documents.map((p: any) => p.$id);
      let allRequests: any[] = [];
      
      if (propertyIds.length > 0) {
        try {
          const requestsResponse = await databases.listDocuments(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            process.env.NEXT_PUBLIC_APPWRITE_REQUESTS_COLLECTION_ID!,
            [
              Query.equal("propertyId", propertyIds),
              Query.orderDesc("$createdAt"),
            ]
          );
          allRequests = requestsResponse.documents || [];
        } catch (error) {
          console.error("Error fetching requests:", error);
          allRequests = [];
        }
      }

      const allProperties = propertiesResponse.documents as unknown as Property[];
      const tasks = tasksResponse.documents as unknown as Task[];
      
      cacheService.set(CACHE_KEYS.PROPERTIES, allProperties, 5 * 60 * 1000);
      cacheService.set(CACHE_KEYS.TASKS, tasks, 5 * 60 * 1000);
      cacheService.set(CACHE_KEYS.REQUESTS, allRequests, 5 * 60 * 1000);
      
      processPropertiesData(allProperties, tasks, allRequests);
      
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      const cachedProperties = cacheService.get<Property[]>(CACHE_KEYS.PROPERTIES);
      const cachedTasks = cacheService.get<Task[]>(CACHE_KEYS.TASKS);
      const cachedRequests = cacheService.get<any[]>(CACHE_KEYS.REQUESTS);
      
      if (cachedProperties) {
        processPropertiesData(cachedProperties, cachedTasks || [], cachedRequests || []);
        console.log('📦 Using cached dashboard data due to error');
      }
    } finally {
      setIsLoading(false);
      setTimeout(() => setShowWelcome(false), 5000);
    }
  };

  // Main useEffect
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      const prevStats = loadHistoricalStats();
      if (prevStats) {
        setHistoricalStats(prevStats);
      }

      const cachedProperties = cacheService.get<Property[]>(CACHE_KEYS.PROPERTIES);
      const cachedTasks = cacheService.get<Task[]>(CACHE_KEYS.TASKS);
      
      if (cachedProperties && cachedProperties.length > 0) {
        console.log('📦 Loading dashboard data from cache');
        processPropertiesData(cachedProperties, cachedTasks || []);
        if (isMounted) {
          setIsLoading(false);
        }
      }
      
      if (navigator.onLine && organization?.userId) {
        console.log('🔄 Refreshing dashboard data from server');
        await fetchDashboardData();
      } else if (!navigator.onLine && cachedProperties) {
        console.log('📴 Offline mode - using cached dashboard data');
        if (isMounted) {
          setIsLoading(false);
        }
      } else if (!navigator.onLine && !cachedProperties) {
        console.log('📴 Offline mode - no cached data available');
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [organization?.userId, organization?.$id]);

  const organizationName = organization && "name" in organization ? (organization as { name: string }).name : "Organization";

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800";
      case "low":
        return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getTrend = (key: string): StatTrend => {
    return trends[key] || { value: "+0%", isUp: true };
  };

  // Inside DashboardPage component, after other helper functions
const getRelativeTime = (dateString: string) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor(diffMs / (1000 * 60));
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

  // Color mapping for stat cards
  const getStatColor = (id: string) => {
    switch (id) {
      case 'totalProperties': return 'blue';
      case 'activeListings': return 'green';
      case 'monthlyRevenue': return 'yellow';
      case 'totalViews': return 'purple';
      case 'occupancyRate': return 'cyan';
      case 'responseRate': return 'teal';
      default: return 'blue';
    }
  };

  // 🔥 STAT CARDS - Now using requestsByProperty state
const statCards = [
  {
    id: "totalProperties",
    title: "Total Properties",
    value: stats.totalProperties,
    icon: Building2,
    color: "blue",
    trend: getTrend("totalProperties"),
    description: "Total properties in portfolio",
    properties: allProperties.map((p: Property) => ({
      $id: p.$id,
      propertyName: p.propertyName,
      views: p.views || 0,
      likes: p.likes || 0,
      requests: p.requests || 0,
      isAvailable: p.isAvailable,
    })),
  },
  {
    id: "occupiedListings",
    title: "Occupied Listings",
    value: stats.occupiedListings || 0,
    icon: Home,
    color: "purple",
    trend: getTrend("occupiedListings"),
    description: `${stats.occupiedListings || 0} properties currently rented`,
    properties: allProperties
      .filter((p: Property) => p.isAvailable === false)
      .map((p: Property) => ({
        $id: p.$id,
        propertyName: p.propertyName,
        views: p.views || 0,
        likes: p.likes || 0,
        requests: p.requests || 0,
        isAvailable: p.isAvailable,
      })),
  },
  {
    id: "totalViews",
    title: "Total Views",
    value: stats.totalViews.toLocaleString(),
    icon: Eye,
    color: "purple",
    trend: getTrend("totalViews"),
    description: "Property listing views",
    properties: allProperties
      .map((p: Property) => ({
        $id: p.$id,
        propertyName: p.propertyName,
        views: p.views || 0,
        likes: p.likes || 0,
        requests: p.requests || 0,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5),
  },
  {
    id: "occupancyRate",
    title: "Occupancy Rate",
    value: `${stats.occupancyRate}%`,
    icon: Target,
    color: "cyan",
    trend: getTrend("occupancyRate"),
    description: `${stats.occupiedListings || 0} of ${stats.totalProperties} occupied`,
    properties: allProperties.map((p: Property) => ({
      $id: p.$id,
      propertyName: p.propertyName,
      views: p.views || 0,
      likes: p.likes || 0,
      requests: p.requests || 0,
      isAvailable: p.isAvailable,
      status: p.isAvailable ? 'Available' : 'Occupied',
    })),
  },
  {
    id: "responseRate",
    title: "Response Rate",
    value: `${stats.responseRate}%`,
    icon: MessageCircle,
    color: "teal",
    trend: getTrend("responseRate"),
    description: "Inquiry response rate",
    properties: allProperties.map((p: Property) => {
      const requestCount = requestsByProperty[p.$id]?.length || 0;
      return {
        $id: p.$id,
        propertyName: p.propertyName,
        views: p.views || 0,
        likes: p.likes || 0,
        requests: requestCount,
        responseRate: requestCount,
      };
    })
    .sort((a, b) => b.requests - a.requests)
    .slice(0, 5),
  },
];

  const getMargin = () => {
    if (isMobile) {
      return 'ml-0';
    }
    return isSidebarCollapsed ? 'ml-16' : 'ml-64';
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className={`min-h-screen transition-colors duration-500 ${
          isOffline 
            ? 'bg-gray-100 dark:bg-gray-800' 
            : resolvedTheme === 'dark'
            ? 'bg-gray-900'
            : 'bg-linear-to-br from-blue-50 via-white to-orange-50'
        }`}>
          <Sidebar />
          <div className={`transition-all duration-300 ease-in-out ${getMargin()}`}>
            <Header />
            <main className="p-6">
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-500)] mx-auto" />
                  <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard...</p>
                </div>
              </div>
            </main>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className={`min-h-screen transition-colors duration-500 ${
        isOffline 
          ? 'bg-gray-100 dark:bg-gray-800' 
          : resolvedTheme === 'dark'
          ? 'bg-gray-900'
          : 'bg-orange-50'
      }`}>
        <Sidebar />
        <div className={`transition-all duration-300 ease-in-out ${getMargin()}`}>
          <Header />
          <main className="p-6">

            {/* SECTION 2: KEY METRICS - Using Premium StatsCard */}
            <section className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isOffline 
                      ? 'bg-gray-400 dark:bg-gray-600' 
                      : 'bg-[var(--accent-500)]'
                  }`}>
                    <LayoutDashboard className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                    Key Metrics
                  </h2>
                  {isOffline && (
                    <span className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded-full">
                      Cached
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (!isOffline) {
                      fetchDashboardData();
                    } else {
                      alert("You're offline. Please connect to the internet to refresh data.");
                    }
                  }}
                  disabled={isOffline}
                  className={`flex items-center gap-1 text-xs px-3 py-1 bg-white dark:bg-gray-700 rounded-lg shadow-sm hover:shadow border border-gray-200 dark:border-gray-600 transition ${
                    isOffline 
                      ? "text-gray-400 dark:text-gray-500 cursor-not-allowed" 
                      : "text-gray-500 dark:text-gray-300 hover:text-[var(--accent-500)] dark:hover:text-[var(--accent-400)]"
                  }`}
                >
                  <RefreshCw className={`w-3 h-3 ${isOffline ? "" : "hover:rotate-180 transition-transform duration-500"}`} />
                  Refresh
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {statCards.map((stat) => {
                  const IconComponent = stat.icon;
                  
                  return (
                    <StatsCard
                      key={stat.id}
                      title={stat.title}
                      value={stat.value}
                      color={stat.color}
                      statId={stat.id}
                      properties={stat.properties}
                    />
                  );
                })}
              </div>
            </section>

            {/* SECTION 3: PROPERTIES & PERFORMANCE */}
            <section className="mb-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Recent Properties - Column 1 */}
                <div className={`rounded-2xl shadow-lg hover:shadow-xl transition-shadow border flex flex-col ${
                  isOffline 
                    ? 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600' 
                    : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
                }`}>
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                          Recent Properties
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                          Latest listings
                        </p>
                      </div>
                      <Link
                        href="/dashboard/properties"
                        className="text-[var(--accent-500)] dark:text-[var(--accent-400)] hover:text-[var(--accent-600)] dark:hover:text-[var(--accent-300)] text-xs font-medium flex items-center gap-1 group"
                      >
                        View All{" "}
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>

                    <div className="flex-1">
                      {recentProperties.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl h-full flex flex-col items-center justify-center">
                          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2">
                            <Home className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                          </div>
                          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                            No properties yet
                          </h3>
                          <p className="text-gray-500 dark:text-gray-400 text-xs mb-3">
                            Add your first property
                          </p>
                          <Link
                            href="/dashboard/properties/new"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white text-xs rounded-lg transition"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            Add Property
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-2 h-full flex flex-col justify-around">
                          {recentProperties.slice(0, 5).map((property: Property) => {
                            const propertyStatus = property.isAvailable === true ? "Available" : "Rented";
                            const StatusIcon = property.isAvailable === true ? CheckCircle : Clock;
                            const propertyImage = property.image1 || property.image2 || property.image3;

                            return (

<Link
  key={property.$id}
  href={`/dashboard/properties/${property.$id}`}
  className={`flex items-center justify-between p-2.5 rounded-lg transition-all duration-300 group border border-transparent hover:border-[var(--accent-200)] dark:hover:border-[var(--accent-800)] flex-1 ${
    isOffline 
      ? 'bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500' 
      : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-[var(--accent-50)] dark:hover:bg-[var(--accent-950)]/20'
  }`}
>
  <div className="flex items-center gap-2.5 min-w-0 flex-1">
    <div className="w-9 h-9 rounded-lg overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 shrink-0">
      {propertyImage ? (
        <Image
          src={propertyImage}
          alt={property.propertyName}
          width={36}
          height={36}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Building2 className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1.5">
        <h3 className={`text-xs font-semibold truncate group-hover:text-[var(--accent-500)] dark:group-hover:text-[var(--accent-400)] transition-colors ${
          isOffline ? 'text-gray-700 dark:text-gray-200' : 'text-gray-800 dark:text-gray-200'
        }`}>
          {property.propertyName}
        </h3>
        {/* Status Dot */}
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
          propertyStatus === "Available" ? "bg-green-500" : "bg-blue-500"
        }`} />
      </div>
      
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-gray-500 dark:text-gray-400">
          {property.bedrooms} bed • {property.bathrooms} bath
        </span>
        <span className="text-[10px] font-semibold text-[var(--accent-500)] dark:text-[var(--accent-400)]">
          ${property.price}/mo
        </span>
      </div>
      
      {/* New: Property Details Row */}
      <div className="flex items-center gap-2 mt-0.5">
        {/* Area/Location */}
        {property.location && (
          <span className="text-[8px] text-gray-400 dark:text-gray-500 truncate max-w-[80px]">
            📍 {property.location}
          </span>
        )}
        
        {/* Listing Date */}
        <span className="text-[8px] text-gray-400 dark:text-gray-500 flex items-center gap-0.5">
          <Calendar className="w-2.5 h-2.5" />
          {getRelativeTime(property.$createdAt)}
        </span>
        
        {/* Property Type */}
        {property.propertyType && (
          <span className="text-[8px] px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400">
            {property.propertyType}
          </span>
        )}
      </div>
    </div>
  </div>
  
  {/* Status Badge - made smaller and cleaner */}
  <span
    className={`px-1.5 py-0.5 rounded-full text-[8px] font-medium flex items-center gap-0.5 border shrink-0 ml-2 ${propertyStatus === "Available" ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800" : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"}`}
  >
    <StatusIcon className="w-2.5 h-2.5" />
    {propertyStatus}
  </span>
</Link>

                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Performance Charts - Column 2 */}
                <div className={`rounded-2xl shadow-lg hover:shadow-xl transition-shadow border flex flex-col ${
                  isOffline 
                    ? 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600' 
                    : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
                }`}>
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                          Property Insights
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                          Status, views & performance
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => {
                            if (!isOffline) {
                              fetchDashboardData();
                            } else {
                              alert("You're offline. Please connect to the internet to refresh.");
                            }
                          }}
                          disabled={isOffline}
                          className={`text-[10px] px-2 py-1 rounded-lg transition flex items-center gap-1 ${
                            isOffline 
                              ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                              : 'bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white'
                          }`}
                        >
                          <RefreshCw className="w-3 h-3" />
                          Refresh
                        </button>
                        <Link
                          href="/dashboard/analytics"
                          className="text-[10px] px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition flex items-center gap-1"
                        >
                          <BarChart3 className="w-3 h-3" />
                          Details
                        </Link>
                      </div>
                    </div>

                    <div className="flex-1">
                      {recentProperties.length > 0 ? (
                        <div className="h-full flex flex-col">
                          {/* Donut Charts */}
                          <div className="grid grid-cols-3 gap-2 flex-1">
                            {/* Donut 1: Property Status */}
                            <div className="flex flex-col items-center justify-center">
                              <div className="relative w-28 h-28">
                                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                                  <circle cx="50" cy="50" r="38" fill="none" stroke="#e5e7eb" strokeWidth="10" className="dark:stroke-gray-700" />
                                  {(() => {
                                    const total = recentProperties.length;
                                    const available = recentProperties.filter(p => p.isAvailable === true).length;
                                    const availablePercent = total > 0 ? (available / total) * 100 : 0;
                                    const rentedPercent = total > 0 ? ((total - available) / total) * 100 : 0;
                                    const circumference = 2 * Math.PI * 38;
                                    
                                    return (
                                      <>
                                        {availablePercent > 0 && (
                                          <circle
                                            cx="50"
                                            cy="50"
                                            r="38"
                                            fill="none"
                                            stroke="#22c55e"
                                            strokeWidth="10"
                                            strokeDasharray={`${(availablePercent / 100) * circumference} ${circumference}`}
                                            strokeDashoffset="0"
                                            strokeLinecap="round"
                                            className="transition-all duration-1000"
                                          />
                                        )}
                                        {rentedPercent > 0 && (
                                          <circle
                                            cx="50"
                                            cy="50"
                                            r="38"
                                            fill="none"
                                            stroke="#3b82f6"
                                            strokeWidth="10"
                                            strokeDasharray={`${(rentedPercent / 100) * circumference} ${circumference}`}
                                            strokeDashoffset={-((availablePercent / 100) * circumference)}
                                            strokeLinecap="round"
                                            className="transition-all duration-1000"
                                          />
                                        )}
                                      </>
                                    );
                                  })()}
                                  <circle cx="50" cy="50" r="28" fill="white" className="dark:fill-gray-800" />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                  <p className="text-[10px] font-bold text-gray-900 dark:text-gray-100">
                                    {recentProperties.filter(p => p.isAvailable === true).length}
                                  </p>
                                  <p className="text-[6px] text-gray-500 dark:text-gray-400">Available</p>
                                </div>
                              </div>
                              <p className="text-[8px] font-medium text-gray-600 dark:text-gray-300 mt-1">Status</p>
                            </div>

                            {/* Donut 2: Views Distribution */}
                            <div className="flex flex-col items-center justify-center">
                              <div className="relative w-28 h-28">
                                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                                  <circle cx="50" cy="50" r="38" fill="none" stroke="#e5e7eb" strokeWidth="10" className="dark:stroke-gray-700" />
                                  {(() => {
                                    const total = recentProperties.length;
                                    const highViews = recentProperties.filter(p => (p.views || 0) > 5).length;
                                    const lowViews = recentProperties.filter(p => (p.views || 0) <= 5 && (p.views || 0) > 0).length;
                                    const noViews = recentProperties.filter(p => (p.views || 0) === 0).length;
                                    const circumference = 2 * Math.PI * 38;
                                    
                                    return (
                                      <>
                                        {highViews > 0 && (
                                          <circle
                                            cx="50"
                                            cy="50"
                                            r="38"
                                            fill="none"
                                            stroke="#f97316"
                                            strokeWidth="10"
                                            strokeDasharray={`${((highViews / total) * 100 / 100) * circumference} ${circumference}`}
                                            strokeDashoffset="0"
                                            strokeLinecap="round"
                                            className="transition-all duration-1000"
                                          />
                                        )}
                                        {lowViews > 0 && (
                                          <circle
                                            cx="50"
                                            cy="50"
                                            r="38"
                                            fill="none"
                                            stroke="#fbbf24"
                                            strokeWidth="10"
                                            strokeDasharray={`${((lowViews / total) * 100 / 100) * circumference} ${circumference}`}
                                            strokeDashoffset={-((highViews / total) * 100 / 100) * circumference}
                                            strokeLinecap="round"
                                            className="transition-all duration-1000"
                                          />
                                        )}
                                        {noViews > 0 && (
                                          <circle
                                            cx="50"
                                            cy="50"
                                            r="38"
                                            fill="none"
                                            stroke="#9ca3af"
                                            strokeWidth="10"
                                            strokeDasharray={`${((noViews / total) * 100 / 100) * circumference} ${circumference}`}
                                            strokeDashoffset={-(((highViews + lowViews) / total) * 100 / 100) * circumference}
                                            strokeLinecap="round"
                                            className="transition-all duration-1000"
                                          />
                                        )}
                                      </>
                                    );
                                  })()}
                                  <circle cx="50" cy="50" r="28" fill="white" className="dark:fill-gray-800" />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                  <p className="text-[10px] font-bold text-gray-900 dark:text-gray-100">
                                    {recentProperties.reduce((sum, p) => sum + (p.views || 0), 0)}
                                  </p>
                                  <p className="text-[6px] text-gray-500 dark:text-gray-400">Total Views</p>
                                </div>
                              </div>
                              <p className="text-[8px] font-medium text-gray-600 dark:text-gray-300 mt-1">Views</p>
                            </div>

                            {/* Donut 3: Engagement Rate */}
                            <div className="flex flex-col items-center justify-center">
                              <div className="relative w-28 h-28">
                                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                                  <circle cx="50" cy="50" r="38" fill="none" stroke="#e5e7eb" strokeWidth="10" className="dark:stroke-gray-700" />
                                  {(() => {
                                    const total = recentProperties.length;
                                    const hasLikes = recentProperties.filter(p => (p.likes || 0) > 0).length;
                                    const noLikes = recentProperties.filter(p => (p.likes || 0) === 0).length;
                                    const circumference = 2 * Math.PI * 38;
                                    
                                    return (
                                      <>
                                        {hasLikes > 0 && (
                                          <circle
                                            cx="50"
                                            cy="50"
                                            r="38"
                                            fill="none"
                                            stroke="#8b5cf6"
                                            strokeWidth="10"
                                            strokeDasharray={`${((hasLikes / total) * 100 / 100) * circumference} ${circumference}`}
                                            strokeDashoffset="0"
                                            strokeLinecap="round"
                                            className="transition-all duration-1000"
                                          />
                                        )}
                                        {noLikes > 0 && (
                                          <circle
                                            cx="50"
                                            cy="50"
                                            r="38"
                                            fill="none"
                                            stroke="#d1d5db"
                                            strokeWidth="10"
                                            strokeDasharray={`${((noLikes / total) * 100 / 100) * circumference} ${circumference}`}
                                            strokeDashoffset={-((hasLikes / total) * 100 / 100) * circumference}
                                            strokeLinecap="round"
                                            className="transition-all duration-1000"
                                          />
                                        )}
                                      </>
                                    );
                                  })()}
                                  <circle cx="50" cy="50" r="28" fill="white" className="dark:fill-gray-800" />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                  <p className="text-[10px] font-bold text-gray-900 dark:text-gray-100">
                                    {recentProperties.reduce((sum, p) => sum + (p.likes || 0), 0)}
                                  </p>
                                  <p className="text-[6px] text-gray-500 dark:text-gray-400">Total Likes</p>
                                </div>
                              </div>
                              <p className="text-[8px] font-medium text-gray-600 dark:text-gray-300 mt-1">Engagement</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-1.5 pt-2 mt-1 border-t border-gray-200 dark:border-gray-700">
                            <button
                              onClick={() => {
                                if (isOffline) {
                                  alert("You're offline. Please connect to the internet to export.");
                                  return;
                                }
                                
                                const headers = ['Property Name', 'Status', 'Price', 'Bedrooms', 'Bathrooms', 'Views', 'Likes', 'Requests'];
                                const rows = recentProperties.map(p => [
                                  p.propertyName,
                                  p.isAvailable ? 'Available' : 'Rented',
                                  p.price || 0,
                                  p.bedrooms || 0,
                                  p.bathrooms || 0,
                                  p.views || 0,
                                  p.likes || 0,
                                  p.requests || 0
                                ]);
                                
                                let csvContent = headers.join(',') + '\n';
                                rows.forEach(row => {
                                  csvContent += row.join(',') + '\n';
                                });
                                
                                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                const link = document.createElement('a');
                                const url = URL.createObjectURL(blob);
                                link.setAttribute('href', url);
                                link.setAttribute('download', `properties_export_${new Date().toISOString().slice(0,10)}.csv`);
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                URL.revokeObjectURL(url);
                                
                                const btn = document.activeElement;
                                if (btn) {
                                  const originalText = btn.innerHTML;
                                  btn.innerHTML = '✓ Exported!';
                                  setTimeout(() => {
                                    btn.innerHTML = originalText;
                                  }, 2000);
                                }
                              }}
                              disabled={isOffline || recentProperties.length === 0}
                              className={`text-[9px] px-2 py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${
                                isOffline || recentProperties.length === 0
                                  ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                                  : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                              }`}
                            >
                              <FileText className="w-3 h-3" />
                              Export Report
                            </button>
                            <button
                              onClick={async () => {
                                if (isOffline) {
                                  alert("You're offline. Please connect to the internet to share.");
                                  return;
                                }
                                
                                if (recentProperties.length === 0) {
                                  alert("No properties to share.");
                                  return;
                                }
                                
                                const totalProperties = recentProperties.length;
                                const available = recentProperties.filter(p => p.isAvailable === true).length;
                                const totalViews = recentProperties.reduce((sum, p) => sum + (p.views || 0), 0);
                                const totalLikes = recentProperties.reduce((sum, p) => sum + (p.likes || 0), 0);
                                
                                const shareText = `
📊 Nookly Property Insights
━━━━━━━━━━━━━━━━━━━━━━━
🏠 Total Properties: ${totalProperties}
✅ Available: ${available}
🔵 Rented: ${totalProperties - available}
👁️ Total Views: ${totalViews}
❤️ Total Likes: ${totalLikes}
━━━━━━━━━━━━━━━━━━━━━━━
📅 ${new Date().toLocaleDateString()}
                                `.trim();
                                
                                if (navigator.share) {
                                  try {
                                    await navigator.share({
                                      title: 'Nookly Property Insights',
                                      text: shareText,
                                    });
                                    return;
                                  } catch (error) {
                                    if ((error as Error).name !== 'AbortError') {
                                      console.error('Share error:', error);
                                    }
                                  }
                                }
                                
                                try {
                                  await navigator.clipboard.writeText(shareText);
                                  alert('✅ Insights copied to clipboard!\n\nYou can now paste and share them anywhere.');
                                } catch (error) {
                                  console.error('Clipboard error:', error);
                                  alert('📋 Copy this text to share:\n\n' + shareText);
                                }
                              }}
                              disabled={isOffline || recentProperties.length === 0}
                              className={`text-[9px] px-2 py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${
                                isOffline || recentProperties.length === 0
                                  ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                              }`}
                            >
                              <Share2 className="w-3 h-3" />
                              Share Insights
                            </button>
                          </div>

                          <div className="flex flex-wrap justify-center gap-3 pt-1.5 mt-1 border-t border-gray-200 dark:border-gray-700">
                            <span className="text-[10px] text-green-500 dark:text-green-400">● Available</span>
                            <span className="text-[10px] text-blue-500 dark:text-blue-400">● Rented</span>
                            <span className="text-[10px] text-orange-500 dark:text-orange-400">● High Views</span>
                            <span className="text-[10px] text-yellow-500 dark:text-yellow-400">● Low Views</span>
                            <span className="text-[10px] text-gray-400 dark:text-gray-400">● No Views</span>
                            <span className="text-[10px] text-purple-500 dark:text-purple-400">● Liked</span>
                            <span className="text-[10px] text-gray-300 dark:text-gray-200">● No Likes</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl h-full flex flex-col items-center justify-center">
                          <BarChart3 className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-1.5" />
                          <p className="text-xs text-gray-500 dark:text-gray-400">No data available</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 4: ACTIVITIES & QUICK STATS */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Recent Activity Card */}
              <div className={`rounded-2xl shadow-lg hover:shadow-xl transition-shadow border flex flex-col ${
                isOffline 
                  ? 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600' 
                  : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
              }`}>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isOffline 
                          ? 'bg-gray-400 dark:bg-gray-600' 
                          : 'bg-[var(--accent-500)]'
                      }`}>
                        <Activity className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                          Recent Activity
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 text-[10px] mt-0.5">
                          Latest updates from your properties
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isOffline && (
                        <span className="text-[10px] text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded-full">
                          Cached
                        </span>
                      )}
                      <button
                        onClick={() => {
                          if (isOffline) {
                            alert("You're offline. Please connect to the internet to export.");
                            return;
                          }
                          
                          if (recentActivities.length === 0) {
                            alert("No activity data to export.");
                            return;
                          }
                          
                          const headers = ['Activity', 'Property', 'Time'];
                          const rows = recentActivities.map(a => [
                            a.action,
                            a.property,
                            a.time
                          ]);
                          
                          let csvContent = '📊 Recent Activity Report\n';
                          csvContent += `Generated: ${new Date().toLocaleString()}\n`;
                          csvContent += `Total Activities: ${recentActivities.length}\n\n`;
                          csvContent += headers.join(',') + '\n';
                          rows.forEach(row => {
                            csvContent += row.join(',') + '\n';
                          });
                          
                          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                          const link = document.createElement('a');
                          const url = URL.createObjectURL(blob);
                          link.setAttribute('href', url);
                          link.setAttribute('download', `activity_report_${new Date().toISOString().slice(0,10)}.csv`);
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          URL.revokeObjectURL(url);
                        }}
                        disabled={isOffline || recentActivities.length === 0}
                        className={`text-[10px] px-2 py-1 rounded-lg transition flex items-center gap-1 ${
                          isOffline || recentActivities.length === 0
                            ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                        title="Export activity report"
                      >
                        <FileText className="w-3 h-3" />
                        Export
                      </button>
                    </div>
                  </div>

                  <div className="flex-1">
                    {recentActivities.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl h-full flex flex-col items-center justify-center">
                        <Activity className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                        <p className="text-xs text-gray-500 dark:text-gray-400">No recent activity</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Activity will appear here</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {recentActivities.map((activity: RecentActivity) => {
                          const Icon = activity.icon;
                          const typeColors = {
                            view: "text-blue-500 dark:text-blue-400",
                            like: "text-red-500 dark:text-red-400",
                            request: "text-purple-500 dark:text-purple-400",
                            review: "text-yellow-500 dark:text-yellow-400",
                          };
                          const iconColors = {
                            view: "bg-blue-50 dark:bg-blue-900/20",
                            like: "bg-red-50 dark:bg-red-900/20",
                            request: "bg-purple-50 dark:bg-purple-900/20",
                            review: "bg-yellow-50 dark:bg-yellow-900/20",
                          };
                          
                          return (
                            <Link
                              key={activity.id}
                              href={`/dashboard/properties/${activity.propertyId}`}
                              className={`flex items-center gap-3 p-2.5 rounded-lg transition-all duration-300 group border border-transparent hover:border-[var(--accent-200)] dark:hover:border-[var(--accent-800)] ${
                                isOffline 
                                  ? 'hover:bg-gray-300 dark:hover:bg-gray-600' 
                                  : 'hover:bg-[var(--accent-50)] dark:hover:bg-[var(--accent-950)]/20'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform border ${
                                iconColors[activity.type] || 'bg-gray-100 dark:bg-gray-700'
                              } ${
                                isOffline 
                                  ? 'bg-gray-300 dark:bg-gray-600 border-gray-400 dark:border-gray-500' 
                                  : 'bg-[var(--accent-50)] dark:bg-[var(--accent-950)]/30 border-[var(--accent-200)] dark:border-[var(--accent-800)]'
                              }`}>
                                <Icon className={`w-4 h-4 ${typeColors[activity.type] || 'text-gray-500'}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-medium truncate ${
                                  isOffline ? 'text-gray-700 dark:text-gray-300' : 'text-gray-800 dark:text-gray-200'
                                }`}>
                                  {activity.action}
                                </p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                                  {activity.property}
                                </p>
                              </div>
                              <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">
                                {activity.time}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <Link
                      href="/dashboard/properties"
                      className="flex-1 text-center text-[10px] text-[var(--accent-500)] dark:text-[var(--accent-400)] hover:text-[var(--accent-600)] dark:hover:text-[var(--accent-300)] font-medium py-1.5 rounded-lg hover:bg-[var(--accent-50)] dark:hover:bg-[var(--accent-950)]/20 transition-all border border-gray-200 dark:border-gray-700 hover:border-[var(--accent-200)] dark:hover:border-[var(--accent-800)]"
                    >
                      View All Activity →
                    </Link>
                    <button
                      onClick={() => {
                        if (!isOffline) {
                          fetchDashboardData();
                          const btn = document.activeElement;
                          if (btn) {
                            const originalText = btn.innerHTML;
                            btn.innerHTML = '✓ Refreshed';
                            setTimeout(() => {
                              btn.innerHTML = originalText;
                            }, 2000);
                          }
                        } else {
                          alert("You're offline. Please connect to the internet to refresh.");
                        }
                      }}
                      disabled={isOffline}
                      className={`text-[10px] px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
                        isOffline 
                          ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <RefreshCw className="w-3 h-3" />
                      Refresh
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Stats Card */}
              <div className={`rounded-2xl shadow-lg hover:shadow-xl transition-all border flex flex-col ${
                isOffline 
                  ? 'bg-gray-600 dark:bg-gray-700 border-gray-400/30' 
                  : resolvedTheme === 'dark'
                  ? 'bg-gray-800 border-gray-600'
                  : 'bg-indigo-900 border-blue-400/30'
              }`}>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Zap className={`w-5 h-5 animate-pulse ${
                        isOffline ? 'text-gray-300' : 'text-yellow-400'
                      }`} />
                      <h3 className="font-semibold text-white">Quick Stats</h3>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isOffline && (
                        <span className="text-[10px] text-yellow-300 bg-yellow-500/20 px-2 py-0.5 rounded-full">
                          Cached
                        </span>
                      )}
                      <button
                        onClick={() => {
                          if (isOffline) {
                            alert("You're offline. Please connect to the internet to export.");
                            return;
                          }
                          
                          if (recentProperties.length === 0) {
                            alert("No data to export.");
                            return;
                          }
                          
                          // ... export logic
                        }}
                        disabled={isOffline || recentProperties.length === 0}
                        className={`text-[10px] px-2 py-1 rounded-lg transition flex items-center gap-1 ${
                          isOffline || recentProperties.length === 0
                            ? 'bg-gray-500/30 text-gray-400 cursor-not-allowed' 
                            : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                        title="Export report as CSV"
                      >
                        <FileText className="w-3 h-3" />
                        Export
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-xs ${isOffline ? 'text-gray-300' : 'text-blue-200'}`}>Response Rate</span>
                        <span className="font-bold text-white">{stats.responseRate}%</span>
                      </div>
                      <div className={`w-full rounded-full h-2 overflow-hidden ${isOffline ? 'bg-gray-500/30' : 'bg-blue-500/30'}`}>
                        <div className="bg-gradient-to-r from-green-400 to-green-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${stats.responseRate}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-xs ${isOffline ? 'text-gray-300' : 'text-blue-200'}`}>Satisfaction Score</span>
                        <span className="font-bold flex items-center gap-1 text-white">
                          {stats.satisfactionScore} <Star className={`w-3 h-3 ${isOffline ? 'text-gray-300' : 'text-yellow-400 fill-yellow-400'}`} />
                        </span>
                      </div>
                      <div className={`w-full rounded-full h-2 overflow-hidden ${isOffline ? 'bg-gray-500/30' : 'bg-blue-500/30'}`}>
                        <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${(stats.satisfactionScore / 5) * 100}%` }} />
                      </div>
                    </div>

                    <div className={`pt-2 border-t ${isOffline ? 'border-gray-500/30' : 'border-blue-500/30'}`}>
                      <div className="flex justify-between items-center">
                        <span className={`text-xs ${isOffline ? 'text-gray-300' : 'text-blue-200'}`}>Active Properties</span>
                        <span className="font-bold text-white">{stats.activeListings}/{stats.totalProperties}</span>
                      </div>
                    </div>

                    <div className={`pt-2 grid grid-cols-2 gap-2 border-t ${isOffline ? 'border-gray-500/30' : 'border-blue-500/30'}`}>
                      <div className={`rounded-lg p-2 text-center ${isOffline ? 'bg-gray-500/20' : 'bg-white/5'}`}>
                        <p className={`text-[8px] ${isOffline ? 'text-gray-400' : 'text-blue-300'}`}>Total Views</p>
                        <p className="text-sm font-bold text-white">{stats.totalViews}</p>
                      </div>
                      <div className={`rounded-lg p-2 text-center ${isOffline ? 'bg-gray-500/20' : 'bg-white/5'}`}>
                        <p className={`text-[8px] ${isOffline ? 'text-gray-400' : 'text-blue-300'}`}>Revenue</p>
                        <p className="text-sm font-bold text-white">${stats.monthlyRevenue}</p>
                      </div>
                    </div>

                    <div className={`pt-2 grid grid-cols-2 gap-1.5 border-t ${isOffline ? 'border-gray-500/30' : 'border-blue-500/30'}`}>
                      <button
                        onClick={() => {
                          if (!isOffline) {
                            router.push('/dashboard/properties/new');
                          } else {
                            alert("You're offline. Please connect to the internet.");
                          }
                        }}
                        disabled={isOffline}
                        className={`text-[10px] px-2 py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${
                          isOffline 
                            ? 'bg-gray-500/30 text-gray-400 cursor-not-allowed' 
                            : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                      >
                        <PlusCircle className="w-3 h-3" />
                        Add Property
                      </button>
                      <button
                        onClick={() => {
                          if (!isOffline) {
                            router.push('/dashboard/messages');
                          } else {
                            alert("You're offline. Please connect to the internet.");
                          }
                        }}
                        disabled={isOffline}
                        className={`text-[10px] px-2 py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${
                          isOffline 
                            ? 'bg-gray-500/30 text-gray-400 cursor-not-allowed' 
                            : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                      >
                        <MessageCircle className="w-3 h-3" />
                        Messages
                      </button>
                    </div>

                    {recentActivities.length > 0 && (
                      <div className={`pt-2 border-t ${isOffline ? 'border-gray-500/30' : 'border-blue-500/30'}`}>
                        <div className="flex items-center justify-between">
                          <p className={`text-[8px] ${isOffline ? 'text-gray-400' : 'text-blue-300'}`}>Latest Activity</p>
                          <span className={`text-[8px] ${isOffline ? 'text-gray-400' : 'text-blue-300'}`}>{recentActivities[0]?.time}</span>
                        </div>
                        <p className="text-[10px] text-white truncate">{recentActivities[0]?.action}</p>
                        <p className={`text-[8px] truncate ${isOffline ? 'text-gray-300' : 'text-blue-200'}`}>{recentActivities[0]?.property}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 5: UPCOMING TASKS */}
            <section className="mb-8">
              <div className={`rounded-2xl shadow-lg hover:shadow-xl transition-shadow border ${
                isOffline 
                  ? 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600' 
                  : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
              }`}>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isOffline 
                          ? 'bg-gray-400 dark:bg-gray-600' 
                          : 'bg-[var(--accent-500)]'
                      }`}>
                        <Calendar className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                          Task Manager
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 text-[10px] mt-0.5">
                          {upcomingTasks.length} task{upcomingTasks.length !== 1 ? 's' : ''} pending
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isOffline && (
                        <span className="text-[10px] text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded-full">
                          Cached
                        </span>
                      )}
                      <button
                        onClick={() => {
                          if (isOffline) {
                            alert("You're offline. Please connect to the internet to export.");
                            return;
                          }
                          
                          if (upcomingTasks.length === 0) {
                            alert("No tasks to export.");
                            return;
                          }
                          
                          // ... export logic
                        }}
                        disabled={isOffline || upcomingTasks.length === 0}
                        className={`text-[10px] px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
                          isOffline || upcomingTasks.length === 0
                            ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                        }`}
                        title="Export tasks as CSV"
                      >
                        <FileText className="w-3 h-3" />
                        Export Tasks
                      </button>
                    </div>
                  </div>
                  
                  {upcomingTasks.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Calendar className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                      </div>
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        No tasks yet
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                        Get started by creating your first task
                      </p>
                      {!isOffline && (
                        <Link
                          href="/dashboard/tasks/new"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white text-sm rounded-lg transition"
                        >
                          <PlusCircle className="w-4 h-4" />
                          Create Task
                        </Link>
                      )}
                      {isOffline && (
                        <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                          Connect to the internet to create tasks
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      {/* Top Priority */}
                      <div className={`rounded-lg p-3 ${isOffline ? 'bg-gray-100 dark:bg-gray-600' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                          <h3 className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Top Priority</h3>
                        </div>
                        {(() => {
                          const highPriorityTasks = upcomingTasks.filter(t => t.priority === 'high');
                          const mediumPriorityTasks = upcomingTasks.filter(t => t.priority === 'medium');
                          const lowPriorityTasks = upcomingTasks.filter(t => t.priority === 'low');
                          const topTask = highPriorityTasks[0] || mediumPriorityTasks[0] || lowPriorityTasks[0];
                          
                          if (!topTask) {
                            return <div className="text-center py-6 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-lg"><p className="text-[8px] text-gray-400 dark:text-gray-500">No tasks available</p></div>;
                          }
                          
                          const overdue = isOverdue(topTask.dueDate);
                          const dueDateDisplay = formatDueDate(topTask.dueDate);
                          const priorityColor = {
                            high: 'border-red-500 bg-red-50 dark:bg-red-900/20',
                            medium: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
                            low: 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          }[topTask.priority] || 'border-gray-500';
                          
                          return (
                            <Link href={`/dashboard/tasks/${topTask.$id}`} className={`block p-3 rounded-lg transition-all duration-300 group cursor-pointer border-l-4 ${priorityColor} ${isOffline ? 'bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 border-gray-200 dark:border-gray-600' : 'bg-white dark:bg-gray-800 hover:shadow-md border-gray-200 dark:border-gray-600'}`}>
                              <p className={`text-xs font-semibold group-hover:text-[var(--accent-500)] dark:group-hover:text-[var(--accent-400)] transition-colors line-clamp-2 flex-1 ${isOffline ? 'text-gray-700 dark:text-gray-300' : 'text-gray-800 dark:text-gray-200'}`}>{topTask.title}</p>
                              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-medium ${getPriorityColor(topTask.priority)}`}>{topTask.priority}</span>
                                <span className={`text-[8px] flex items-center gap-0.5 ${overdue ? "text-red-600 dark:text-red-400 font-medium" : "text-gray-500 dark:text-gray-400"}`}>
                                  <Calendar className="w-2.5 h-2.5" />
                                  {dueDateDisplay}
                                </span>
                              </div>
                              {topTask.propertyName && <p className="text-[8px] text-gray-400 dark:text-gray-500 mt-1.5 truncate">📍 {topTask.propertyName}</p>}
                              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600 flex justify-between items-center">
                                <span className="text-[8px] text-gray-400 dark:text-gray-500">Priority</span>
                                <span className={`text-[8px] font-medium capitalize ${topTask.priority === 'high' ? 'text-red-600 dark:text-red-400' : topTask.priority === 'medium' ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>{topTask.priority}</span>
                              </div>
                            </Link>
                          );
                        })()}
                      </div>

                      {/* Set Priority */}
                      <div className={`rounded-lg p-3 ${isOffline ? 'bg-gray-100 dark:bg-gray-600' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                          <h3 className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Set Priority</h3>
                        </div>
                        {upcomingTasks.length > 0 ? (
                          <div className="space-y-2">
                            {upcomingTasks.slice(0, 3).map((task) => (
                              <div key={task.$id} className={`flex items-center gap-2 p-2 rounded-lg border ${isOffline ? 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-500' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'}`}>
                                <p className="text-[9px] font-medium text-gray-700 dark:text-gray-300 truncate flex-1">{task.title}</p>
                                <select defaultValue={task.priority} className={`text-[8px] px-1.5 py-0.5 rounded border ${isOffline ? 'bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`} disabled={isOffline}>
                                  <option value="high">High</option>
                                  <option value="medium">Medium</option>
                                  <option value="low">Low</option>
                                </select>
                              </div>
                            ))}
                            {upcomingTasks.length > 3 && <Link href="/dashboard/tasks" className="text-[8px] text-[var(--accent-500)] dark:text-[var(--accent-400)] hover:underline block text-center">Manage all tasks →</Link>}
                          </div>
                        ) : (
                          <div className="text-center py-6 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-lg"><p className="text-[8px] text-gray-400 dark:text-gray-500">No tasks to prioritize</p></div>
                        )}
                      </div>

                      {/* Summary */}
                      <div className={`rounded-lg p-3 ${isOffline ? 'bg-gray-100 dark:bg-gray-600' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          <h3 className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Summary</h3>
                        </div>
                        <div className="space-y-2">
                          <div className={`p-2 rounded-lg flex justify-between items-center ${isOffline ? 'bg-gray-200 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'}`}>
                            <span className="text-[9px] text-gray-600 dark:text-gray-400">Total Tasks</span>
                            <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{upcomingTasks.length}</span>
                          </div>
                          <div className={`p-2 rounded-lg flex justify-between items-center ${isOffline ? 'bg-gray-200 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'}`}>
                            <span className="text-[9px] text-gray-600 dark:text-gray-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> High</span>
                            <span className="text-xs font-bold text-red-600 dark:text-red-400">{upcomingTasks.filter(t => t.priority === 'high').length}</span>
                          </div>
                          <div className={`p-2 rounded-lg flex justify-between items-center ${isOffline ? 'bg-gray-200 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'}`}>
                            <span className="text-[9px] text-gray-600 dark:text-gray-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span> Medium</span>
                            <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400">{upcomingTasks.filter(t => t.priority === 'medium').length}</span>
                          </div>
                          <div className={`p-2 rounded-lg flex justify-between items-center ${isOffline ? 'bg-gray-200 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'}`}>
                            <span className="text-[9px] text-gray-600 dark:text-gray-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Low</span>
                            <span className="text-xs font-bold text-green-600 dark:text-green-400">{upcomingTasks.filter(t => t.priority === 'low').length}</span>
                          </div>
                          <div className={`p-2 rounded-lg flex justify-between items-center ${isOffline ? 'bg-gray-200 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'}`}>
                            <span className="text-[9px] text-gray-600 dark:text-gray-400">Overdue</span>
                            <span className="text-xs font-bold text-red-600 dark:text-red-400">{upcomingTasks.filter(t => isOverdue(t.dueDate)).length}</span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className={`rounded-lg p-3 ${isOffline ? 'bg-gray-100 dark:bg-gray-600' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                          <h3 className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Quick Actions</h3>
                        </div>
                        <div className="space-y-2">
                          <Link href="/dashboard/tasks/new" className={`block p-3 rounded-lg text-center transition-all duration-300 border-2 border-dashed ${isOffline ? 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-500 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-[var(--accent-500)] dark:hover:border-[var(--accent-400)] hover:bg-[var(--accent-50)] dark:hover:bg-[var(--accent-950)]/20'}`}>
                            <PlusCircle className={`w-5 h-5 mx-auto mb-1 ${isOffline ? 'text-gray-400 dark:text-gray-500' : 'text-[var(--accent-500)] dark:text-[var(--accent-400)]'}`} />
                            <p className={`text-[10px] font-medium ${isOffline ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>Create New Task</p>
                          </Link>
                          <Link href="/dashboard/tasks" className={`block p-3 rounded-lg text-center transition-all duration-300 border ${isOffline ? 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-500 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:border-[var(--accent-500)] dark:hover:border-[var(--accent-400)] hover:bg-[var(--accent-50)] dark:hover:bg-[var(--accent-950)]/20'}`}>
                            <p className={`text-[10px] font-medium ${isOffline ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>View All Tasks</p>
                            <p className="text-[8px] text-gray-400 dark:text-gray-500">{upcomingTasks.length} pending</p>
                          </Link>
                          {!isOffline && (
                            <button onClick={() => { fetchDashboardData(); const btn = document.activeElement; if (btn) { const originalText = btn.innerHTML; btn.innerHTML = '✓ Refreshed'; setTimeout(() => { btn.innerHTML = originalText; }, 2000); } }} className="w-full p-2.5 rounded-lg text-center transition-all duration-300 border border-gray-200 dark:border-gray-600 hover:border-[var(--accent-500)] dark:hover:border-[var(--accent-400)] hover:bg-[var(--accent-50)] dark:hover:bg-[var(--accent-950)]/20 bg-white dark:bg-gray-800">
                              <div className="flex items-center justify-center gap-1.5">
                                <RefreshCw className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                                <span className="text-[10px] text-gray-600 dark:text-gray-300">Refresh Tasks</span>
                              </div>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* SECTION 6: QUICK ACTION BUTTONS */}
            <section className="mb-8">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isOffline ? 'bg-gray-400 dark:bg-gray-600' : 'bg-[var(--accent-500)]'}`}>
                  <Zap className="w-3 h-3 text-white" />
                </div>
                Quick Actions
              </h2>
              <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 ${isOffline ? 'opacity-75' : ''}`}>
                <Link href="/dashboard/properties/new" className={`group relative overflow-hidden rounded-xl p-4 text-white hover:shadow-xl transition-all transform hover:scale-105 border ${isOffline ? 'bg-gray-500 dark:bg-gray-600 border-gray-400/30 cursor-not-allowed' : 'bg-linear-to-r from-[var(--accent-500)] to-[var(--accent-600)] border-[var(--accent-400)]/30'}`}>
                  <div className="relative flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform border border-white/20">
                      <PlusCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold mb-0.5">Add Property</h3>
                      <p className={`text-xs ${isOffline ? 'text-gray-300' : 'text-white/80'}`}>List new property</p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-white/10 translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
                </Link>
                <Link href="/dashboard/tenants" className={`group relative overflow-hidden rounded-xl p-4 text-white hover:shadow-xl transition-all transform hover:scale-105 border ${isOffline ? 'bg-gray-500 dark:bg-gray-600 border-gray-400/30 cursor-not-allowed' : 'bg-linear-to-r from-green-600 to-green-700 border-green-400/30'}`}>
                  <div className="relative flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform border border-white/20">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold mb-0.5">Find Tenants</h3>
                      <p className={`text-xs ${isOffline ? 'text-gray-300' : 'text-green-100'}`}>List & attract</p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-white/10 translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
                </Link>
                <Link href="/dashboard/messages" className={`group relative overflow-hidden rounded-xl p-4 text-white hover:shadow-xl transition-all transform hover:scale-105 border ${isOffline ? 'bg-gray-500 dark:bg-gray-600 border-gray-400/30 cursor-not-allowed' : 'bg-linear-to-r from-[var(--accent-500)] to-[var(--accent-600)] border-[var(--accent-400)]/30'}`}>
                  <div className="relative flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform border border-white/20">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold mb-0.5">Messages</h3>
                      <p className={`text-xs ${isOffline ? 'text-gray-300' : 'text-white/80'}`}>View inquiries</p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-white/10 translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
                </Link>
                <Link href="/dashboard/analytics" className={`group relative overflow-hidden rounded-xl p-4 text-white hover:shadow-xl transition-all transform hover:scale-105 border ${isOffline ? 'bg-gray-500 dark:bg-gray-600 border-gray-400/30 cursor-not-allowed' : 'bg-linear-to-r from-purple-600 to-purple-700 border-purple-400/30'}`}>
                  <div className="relative flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform border border-white/20">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold mb-0.5">Analytics</h3>
                      <p className={`text-xs ${isOffline ? 'text-gray-300' : 'text-purple-100'}`}>View insights</p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-white/10 translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
                </Link>
              </div>
            </section>

            {/* SECTION 7: FOOTER */}
            <footer className="mt-8 text-center">
              <p className={`text-xs ${isOffline ? 'text-gray-400 dark:text-gray-500' : 'text-gray-400 dark:text-gray-500'}`}>
                © 2026 Nookly - Property Management Platform | Last updated:{" "}
                {lastUpdated.toLocaleTimeString()}
                {isOffline && " (Offline Mode)"}
              </p>
            </footer>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}