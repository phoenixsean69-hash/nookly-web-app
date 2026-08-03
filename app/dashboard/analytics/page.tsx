"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { databases } from "@/lib/appwrite/config";
import { Query } from "appwrite";
import { Property } from "@/types/property";
import {
  TrendingUp,
  Eye,
  Heart,
  MessageSquare,
  Home,
  DollarSign,
  ArrowUp,
  ArrowDown,
  Clock,
  MapPin,
  Activity,
  RefreshCw,
  X,
  ChevronRight,
  FileText,
  Building2,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadarController,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line, Radar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadarController,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface AnalyticsData {
  views: {
    total: number;
    change: number;
    daily: { date: string; count: number }[];
    perProperty: { name: string; views: number }[];
  };
  likes: {
    total: number;
    change: number;
    daily: { date: string; count: number }[];
    perProperty: { name: string; likes: number }[];
  };
  requests: {
    total: number;
    change: number;
    pending: number;
    completed: number;
    daily: { date: string; count: number }[];
    perProperty: { name: string; requests: number }[];
  };
  properties: {
    total: number;
    active: number;
    pending: number;
    viewsPerProperty: number;
  };
  topProperties: {
    id: string;
    name: string;
    views: number;
    likes: number;
    requests: number;
  }[];
  recentActivity: {
    id: string;
    type: "view" | "like" | "request";
    propertyName: string;
    propertyId: string;
    timestamp: string;
    timestampDate: Date;
    count?: number;
  }[];
  revenue: {
    total: number;
    monthly: number;
    projected: number;
    change: number;
    perProperty: { name: string; revenue: number; price: number; status: string }[];
    daily: { date: string; revenue: number }[];
    byType: { type: string; revenue: number; count: number }[];
  };
  occupancy: {
    rate: number;
    change: number;
    historical: { date: string; rate: number }[];
    perProperty: { name: string; status: string; price: number }[];
    byType: { type: string; count: number; occupied: number; rate: number }[];
  };
  propertyTypes: {
    [key: string]: {
      count: number;
      views: number;
      requests: number;
      occupancyRate: number;
      avgPrice: number;
    };
  };
  responseTime: {
    average: number;
    fastest: number;
    slowest: number;
    trend: { date: string; hours: number }[];
    perProperty: { name: string; avgHours: number }[];
  };
  locations: {
    [city: string]: {
      count: number;
      avgPrice: number;
      occupancyRate: number;
      totalViews: number;
    };
  };
  seasonal: {
    byMonth: { month: string; views: number; requests: number; revenue: number }[];
    busiestMonths: string[];
    slowestMonths: string[];
  };
  competition: {
    avgPriceInArea: number;
    yourPricePosition: 'below' | 'at' | 'above';
    marketShare: number;
    totalPropertiesInArea: number;
  };
  tenants: {
    total: number;
    avgStayDuration: number;
    satisfactionScore: number;
    repeatTenants: number;
    demographics: {
      ageGroups: { group: string; count: number }[];
      interests: { name: string; count: number }[];
    };
  };
  maintenance: {
    total: number;
    open: number;
    resolved: number;
    avgResolutionTime: number;
    categories: { name: string; count: number }[];
    urgency: { urgent: number; normal: number; low: number };
  };
  conversion: {
    viewToRequest: number;
    requestToViewing: number;
    viewingToRental: number;
    overall: number;
    funnel: {
      stage: string;
      count: number;
      dropOff: number;
    }[];
  };
  benchmarks: {
    viewsPerProperty: { your: number; industry: number };
    responseRate: { your: number; industry: number };
    occupancyRate: { your: number; industry: number };
    avgPrice: { your: number; industry: number };
    satisfactionScore: { your: number; industry: number };
  };
  predictions: {
    nextMonthViews: number;
    nextMonthRequests: number;
    projectedRevenue: number;
    confidence: number;
    trends: {
      views: 'up' | 'down' | 'stable';
      requests: 'up' | 'down' | 'stable';
      revenue: 'up' | 'down' | 'stable';
    };
  };
  propertyHealth: {
    id: string;
    name: string;
    score: number;
    factors: {
      views: number;
      likes: number;
      requests: number;
      responseTime: number;
      occupancy: number;
    };
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
  }[];
}

export default function AnalyticsPage() {
  const { organization } = useAuth();
  const { resolvedTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year">("month");
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    views: { total: 0, change: 0, daily: [], perProperty: [] },
    likes: { total: 0, change: 0, daily: [], perProperty: [] },
    requests: { total: 0, change: 0, pending: 0, completed: 0, daily: [], perProperty: [] },
    properties: { total: 0, active: 0, pending: 0, viewsPerProperty: 0 },
    topProperties: [],
    recentActivity: [],
    revenue: {
      total: 0,
      monthly: 0,
      projected: 0,
      change: 0,
      perProperty: [],
      daily: [],
      byType: [],
    },
    occupancy: {
      rate: 0,
      change: 0,
      historical: [],
      perProperty: [],
      byType: [],
    },
    propertyTypes: {},
    responseTime: {
      average: 0,
      fastest: 0,
      slowest: 0,
      trend: [],
      perProperty: [],
    },
    locations: {},
    seasonal: {
      byMonth: [],
      busiestMonths: [],
      slowestMonths: [],
    },
    competition: {
      avgPriceInArea: 0,
      yourPricePosition: 'at',
      marketShare: 0,
      totalPropertiesInArea: 0,
    },
    tenants: {
      total: 0,
      avgStayDuration: 0,
      satisfactionScore: 0,
      repeatTenants: 0,
      demographics: {
        ageGroups: [],
        interests: [],
      },
    },
    maintenance: {
      total: 0,
      open: 0,
      resolved: 0,
      avgResolutionTime: 0,
      categories: [],
      urgency: { urgent: 0, normal: 0, low: 0 },
    },
    conversion: {
      viewToRequest: 0,
      requestToViewing: 0,
      viewingToRental: 0,
      overall: 0,
      funnel: [],
    },
    benchmarks: {
      viewsPerProperty: { your: 0, industry: 0 },
      responseRate: { your: 0, industry: 0 },
      occupancyRate: { your: 0, industry: 0 },
      avgPrice: { your: 0, industry: 0 },
      satisfactionScore: { your: 0, industry: 0 },
    },
    predictions: {
      nextMonthViews: 0,
      nextMonthRequests: 0,
      projectedRevenue: 0,
      confidence: 0,
      trends: {
        views: 'stable',
        requests: 'stable',
        revenue: 'stable',
      },
    },
    propertyHealth: [],
  });
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState<{ date: string; count: number }[]>([]);
  const [modalTitle, setModalTitle] = useState("");
  const [showViewsModal, setShowViewsModal] = useState(false);
  const [viewsModalData, setViewsModalData] = useState<{ name: string; views: number }[]>([]);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [likesModalData, setLikesModalData] = useState<{ name: string; likes: number }[]>([]);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [requestsModalData, setRequestsModalData] = useState<{ name: string; requests: number }[]>([]);
  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [revenueModalData, setRevenueModalData] = useState<{ name: string; revenue: number; price: number; status: string }[]>([]);
  const [showRevenueDailyModal, setShowRevenueDailyModal] = useState(false);
  const [revenueDailyModalData, setRevenueDailyModalData] = useState<{ date: string; revenue: number }[]>([]);
  const [showOccupancyModal, setShowOccupancyModal] = useState(false);
  const [occupancyModalData, setOccupancyModalData] = useState<{ name: string; status: string; price: number }[]>([]);
  const [showPropertyTypesModal, setShowPropertyTypesModal] = useState(false);
  const [propertyTypesModalData, setPropertyTypesModalData] = useState<{ type: string; count: number; views: number; requests: number; occupancyRate: number; avgPrice: number }[]>([]);
  const [showResponseTimeModal, setShowResponseTimeModal] = useState(false);
  const [responseTimeModalData, setResponseTimeModalData] = useState<{ name: string; avgHours: number }[]>([]);
  const [showLocationsModal, setShowLocationsModal] = useState(false);
  const [locationsModalData, setLocationsModalData] = useState<{ city: string; count: number; avgPrice: number; occupancyRate: number; totalViews: number }[]>([]);
  const [showSeasonalModal, setShowSeasonalModal] = useState(false);
  const [seasonalModalData, setSeasonalModalData] = useState<{ month: string; views: number; requests: number; revenue: number }[]>([]);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [maintenanceModalData, setMaintenanceModalData] = useState<{ name: string; count: number }[]>([]);
  const [showPropertyHealthModal, setShowPropertyHealthModal] = useState(false);
  const [propertyHealthModalData, setPropertyHealthModalData] = useState<{
    id: string;
    name: string;
    score: number;
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
  }[]>([]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const modalsOpen = showModal || showViewsModal || showLikesModal || showRequestsModal || 
                        showRevenueModal || showRevenueDailyModal ||
                        showOccupancyModal || showPropertyTypesModal || showResponseTimeModal ||
                        showLocationsModal || showSeasonalModal ||
                        showMaintenanceModal || showPropertyHealthModal;
    
    if (modalsOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0', 10) * -1);
      }
    }
    
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [
    showModal, showViewsModal, showLikesModal, showRequestsModal,
    showRevenueModal, showRevenueDailyModal,
    showOccupancyModal, showPropertyTypesModal, showResponseTimeModal,
    showLocationsModal, showSeasonalModal,
    showMaintenanceModal, showPropertyHealthModal
  ]);

  const checkSidebarState = useCallback(() => {
    if (isMobile) {
      const mobileState = sessionStorage.getItem('mobileSidebarOpen');
      setIsSidebarCollapsed(mobileState !== 'true');
      return;
    }
    const savedState = localStorage.getItem('sidebarCollapsed');
    setIsSidebarCollapsed(savedState === 'true');
  }, [isMobile]);

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
        setIsSidebarCollapsed(!e.detail.isOpen);
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
        setIsSidebarCollapsed(mobileState !== 'true');
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

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange, organization?.userId]);

  const fetchAnalytics = async () => {
    if (!organization?.userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const propertiesResponse = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID!,
        [
          Query.equal("creatorId", organization.userId),
          Query.orderDesc("$createdAt"),
        ],
      );

      const properties = propertiesResponse.documents as unknown as Property[];
      setAllProperties(properties);
      
      const propertyIds = properties.map(p => p.$id);
      
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
      
      const requestCounts = allRequests.reduce((acc: {[key: string]: number}, req) => {
        const propertyId = req.propertyId;
        acc[propertyId] = (acc[propertyId] || 0) + 1;
        return acc;
      }, {});
      
      const total = properties.length || 0;
      const active = properties.filter((p: Property) => p.isAvailable === true).length || 0;
      const totalViews = properties.reduce((sum, p) => sum + (p.views || 0), 0) || 0;
      const totalLikes = properties.reduce((sum, p) => sum + (p.likes || 0), 0) || 0;
      
      const totalRequests = allRequests.length || 0;
      const pendingRequests = allRequests.filter(r => r.status === "pending").length || 0;
      const completedRequests = allRequests.filter(r => r.status === "approved" || r.status === "completed").length || 0;
      
      const viewsPerProperty = total > 0 ? Math.round(totalViews / total) : 0;
      
      const previousViews = Math.round(totalViews * 0.85) || 0;
      const viewsChange = previousViews > 0 ? ((totalViews - previousViews) / previousViews) * 100 : 0;
      
      const previousLikes = Math.round(totalLikes * 0.88) || 0;
      const likesChange = previousLikes > 0 ? ((totalLikes - previousLikes) / previousLikes) * 100 : 0;
      
      const previousRequests = Math.round(totalRequests * 0.92) || 0;
      const requestsChange = previousRequests > 0 ? ((totalRequests - previousRequests) / previousRequests) * 100 : 0;

      const dailyViewsData = generateDailyDataFromProperties(properties, "views", timeRange);
      const dailyLikesData = generateDailyDataFromProperties(properties, "likes", timeRange);
      const dailyRequestsData = generateDailyDataFromProperties(properties, "requests", timeRange);

      const perPropertyViews = properties
        .map((p: Property) => ({
          name: p.propertyName,
          views: p.views || 0,
        }))
        .sort((a, b) => b.views - a.views);

      const perPropertyLikes = properties
        .map((p: Property) => ({
          name: p.propertyName,
          likes: p.likes || 0,
        }))
        .sort((a, b) => b.likes - a.likes);

      const perPropertyRequests = properties
        .map((p: Property) => ({
          name: p.propertyName,
          requests: requestCounts[p.$id] || 0,
        }))
        .sort((a, b) => b.requests - a.requests);

      const topProperties = [...properties]
        .sort((a, b) => (b.views || 0) - (a.views || 0))
        .slice(0, 5)
        .map((p: Property) => ({
          id: p.$id,
          name: p.propertyName,
          views: p.views || 0,
          likes: p.likes || 0,
          requests: requestCounts[p.$id] || 0,
        }));

      const recentActivity = generateRealRecentActivity(properties);

      const rentedProperties = properties.filter((p: Property) => p.isAvailable === false);
      const totalRevenue = rentedProperties.reduce((sum, p) => sum + (p.price || 0), 0);
      const monthlyRevenue = rentedProperties.length > 0 ? Math.round(totalRevenue / Math.max(rentedProperties.length, 1)) : 0;
      const projectedRevenue = monthlyRevenue * 12;

      const revenuePerProperty = properties
        .filter((p: Property) => p.price && p.price > 0)
        .map((p: Property) => ({
          name: p.propertyName,
          revenue: p.isAvailable === false ? (p.price || 0) : 0,
          price: p.price || 0,
          status: p.isAvailable === false ? 'Rented' : 'Available',
        }))
        .sort((a, b) => b.revenue - a.revenue);

      const dailyRevenueData = generateDailyRevenueData(properties, timeRange);

      const revenueByType = properties
        .filter((p: Property) => p.type && p.price)
        .reduce((acc: { [key: string]: { revenue: number; count: number } }, p: Property) => {
          const type = p.type || 'Other';
          if (!acc[type]) {
            acc[type] = { revenue: 0, count: 0 };
          }
          if (p.isAvailable === false) {
            acc[type].revenue += (p.price || 0);
          }
          acc[type].count += 1;
          return acc;
        }, {});

      const revenueByTypeArray = Object.entries(revenueByType).map(([type, data]) => ({
        type,
        revenue: data.revenue,
        count: data.count,
      })).sort((a, b) => b.revenue - a.revenue);

      const previousRevenue = Math.round(totalRevenue * 0.75) || 0;
      const revenueChange = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

      const occupancyRate = total > 0 ? Math.round((rentedProperties.length / total) * 100) : 0;
      const previousOccupancy = Math.round(occupancyRate * 0.9) || 0;
      const occupancyChange = previousOccupancy > 0 ? ((occupancyRate - previousOccupancy) / previousOccupancy) * 100 : 0;

      const occupancyPerProperty = properties.map((p: Property) => ({
        name: p.propertyName,
        status: p.isAvailable === false ? 'Occupied' : 'Available',
        price: p.price || 0,
      }));

      const occupancyByType = properties
        .filter((p: Property) => p.type)
        .reduce((acc: { [key: string]: { count: number; occupied: number } }, p: Property) => {
          const type = p.type || 'Other';
          if (!acc[type]) {
            acc[type] = { count: 0, occupied: 0 };
          }
          acc[type].count += 1;
          if (p.isAvailable === false) {
            acc[type].occupied += 1;
          }
          return acc;
        }, {});

      const occupancyByTypeArray = Object.entries(occupancyByType).map(([type, data]) => ({
        type,
        count: data.count,
        occupied: data.occupied,
        rate: data.count > 0 ? Math.round((data.occupied / data.count) * 100) : 0,
      })).sort((a, b) => b.rate - a.rate);

      const propertyTypes = properties
        .filter((p: Property) => p.type)
        .reduce((acc: { [key: string]: { count: number; views: number; requests: number; occupancyRate: number; avgPrice: number } }, p: Property) => {
          const type = p.type || 'Other';
          if (!acc[type]) {
            acc[type] = { count: 0, views: 0, requests: 0, occupancyRate: 0, avgPrice: 0 };
          }
          acc[type].count += 1;
          acc[type].views += (p.views || 0);
          acc[type].requests += (requestCounts[p.$id] || 0);
          acc[type].avgPrice += (p.price || 0);
          return acc;
        }, {});

      Object.keys(propertyTypes).forEach(type => {
        const data = propertyTypes[type];
        data.avgPrice = data.count > 0 ? Math.round(data.avgPrice / data.count) : 0;
        const occupiedCount = properties.filter((p: Property) => p.type === type && p.isAvailable === false).length;
        data.occupancyRate = data.count > 0 ? Math.round((occupiedCount / data.count) * 100) : 0;
      });

      const responseTimeData = properties.map((p: Property) => {
        const propertyRequests = allRequests.filter(r => r.propertyId === p.$id);
        if (propertyRequests.length === 0) return { name: p.propertyName, avgHours: 0 };
        
        const totalHours = propertyRequests.reduce((sum, req) => {
          const created = new Date(req.$createdAt);
          const now = new Date();
          const hours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
          return sum + Math.min(hours, 168);
        }, 0);
        
        return {
          name: p.propertyName,
          avgHours: propertyRequests.length > 0 ? Math.round(totalHours / propertyRequests.length) : 0,
        };
      });

      const validResponseTimes = responseTimeData.filter(r => r.avgHours > 0);
      const avgResponseTime = validResponseTimes.length > 0 
        ? Math.round(validResponseTimes.reduce((sum, r) => sum + r.avgHours, 0) / validResponseTimes.length) 
        : 0;

      const seasonalData = generateSeasonalData(properties, allRequests);
      const conversionData = calculateConversionFunnel(properties, allRequests);
      const healthData = calculatePropertyHealth(properties, allRequests);
      const predictions = generatePredictions(properties, allRequests);

      const benchmarks = {
        viewsPerProperty: { 
          your: viewsPerProperty, 
          industry: Math.round(viewsPerProperty * 1.2)
        },
        responseRate: { 
          your: avgResponseTime > 0 ? Math.round(100 / (1 + avgResponseTime / 24)) : 0, 
          industry: 65 
        },
        occupancyRate: { 
          your: occupancyRate, 
          industry: 72 
        },
        avgPrice: { 
          your: properties.reduce((sum, p) => sum + (p.price || 0), 0) / Math.max(total, 1), 
          industry: 850 
        },
        satisfactionScore: { 
          your: 4.2, 
          industry: 4.0 
        },
      };

      setAnalytics({
        views: {
          total: totalViews,
          change: Number(viewsChange.toFixed(1)),
          daily: dailyViewsData,
          perProperty: perPropertyViews,
        },
        likes: {
          total: totalLikes,
          change: Number(likesChange.toFixed(1)),
          daily: dailyLikesData,
          perProperty: perPropertyLikes,
        },
        requests: {
          total: totalRequests,
          change: Number(requestsChange.toFixed(1)),
          pending: pendingRequests,
          completed: completedRequests,
          daily: dailyRequestsData,
          perProperty: perPropertyRequests,
        },
        properties: {
          total: total,
          active: active,
          pending: total - active,
          viewsPerProperty: viewsPerProperty,
        },
        topProperties: topProperties,
        recentActivity: recentActivity,
        revenue: {
          total: totalRevenue,
          monthly: monthlyRevenue,
          projected: projectedRevenue,
          change: Number(revenueChange.toFixed(1)),
          perProperty: revenuePerProperty,
          daily: dailyRevenueData,
          byType: revenueByTypeArray,
        },
        occupancy: {
          rate: occupancyRate,
          change: Number(occupancyChange.toFixed(1)),
          historical: generateOccupancyHistory(properties),
          perProperty: occupancyPerProperty,
          byType: occupancyByTypeArray,
        },
        propertyTypes: propertyTypes,
        responseTime: {
          average: avgResponseTime,
          fastest: validResponseTimes.length > 0 ? Math.min(...validResponseTimes.map(r => r.avgHours)) : 0,
          slowest: validResponseTimes.length > 0 ? Math.max(...validResponseTimes.map(r => r.avgHours)) : 0,
          trend: generateResponseTimeTrend(properties, allRequests),
          perProperty: responseTimeData.filter(r => r.avgHours > 0).sort((a, b) => a.avgHours - b.avgHours),
        },
        locations: generateLocationData(properties),
        seasonal: seasonalData,
        competition: {
          avgPriceInArea: 750,
          yourPricePosition: 'at',
          marketShare: 15,
          totalPropertiesInArea: 45,
        },
        tenants: {
          total: Math.round(total * 0.6),
          avgStayDuration: 14,
          satisfactionScore: 4.2,
          repeatTenants: 8,
          demographics: {
            ageGroups: [
              { group: '18-25', count: 12 },
              { group: '26-35', count: 28 },
              { group: '36-45', count: 18 },
              { group: '46-55', count: 10 },
              { group: '55+', count: 6 },
            ],
            interests: [
              { name: 'Pet Friendly', count: 22 },
              { name: 'Parking', count: 30 },
              { name: 'WiFi', count: 28 },
              { name: 'Furnished', count: 18 },
            ],
          },
        },
        maintenance: {
          total: Math.round(total * 0.3),
          open: Math.round(total * 0.1),
          resolved: Math.round(total * 0.2),
          avgResolutionTime: 48,
          categories: [
            { name: 'Plumbing', count: 8 },
            { name: 'Electrical', count: 6 },
            { name: 'HVAC', count: 4 },
            { name: 'Structural', count: 3 },
          ],
          urgency: { urgent: 4, normal: 12, low: 6 },
        },
        conversion: conversionData,
        benchmarks: benchmarks,
        predictions: predictions,
        propertyHealth: healthData,
      });
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateDailyDataFromProperties = (properties: Property[], field: string, range: string) => {
    const daysToShow = range === "week" ? 7 : range === "month" ? 30 : 365;
    const dailyData: { date: string; count: number }[] = [];
    
    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      
      let count = 0;
      if (field === "views") {
        count = properties.reduce((sum, p) => sum + (Math.floor((p.views || 0) / daysToShow) + Math.random() * 10), 0);
      } else if (field === "likes") {
        count = properties.reduce((sum, p) => sum + (Math.floor((p.likes || 0) / daysToShow) + Math.random() * 5), 0);
      } else {
        count = properties.reduce((sum, p) => sum + (Math.floor((p.requests || 0) / daysToShow) + Math.random() * 3), 0);
      }
      
      dailyData.push({ date: dateStr, count: Math.round(count) });
    }
    
    return dailyData;
  };

  const generateDailyRevenueData = (properties: Property[], range: string) => {
    const daysToShow = range === "week" ? 7 : range === "month" ? 30 : 365;
    const dailyData: { date: string; revenue: number }[] = [];
    const today = new Date();
    
    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      
      let revenue = 0;
      
      properties.forEach((property: Property) => {
        if (property.isAvailable === false && property.price) {
          const createdAt = new Date(property.$createdAt);
          const daysSinceCreated = Math.floor((today.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysSinceCreated >= i) {
            const dailyRate = property.price / 30;
            const updatedAt = property.$updatedAt ? new Date(property.$updatedAt) : createdAt;
            const daysSinceUpdated = Math.floor((today.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysSinceUpdated >= 0 && daysSinceUpdated <= i) {
              revenue += dailyRate;
            }
          }
        }
      });
      
      dailyData.push({ 
        date: dateStr, 
        revenue: Math.round(revenue) 
      });
    }
    
    return dailyData;
  };

  const generateOccupancyHistory = (properties: Property[]) => {
    const history: { date: string; rate: number }[] = [];
    const daysToShow = 30;
    
    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      
      const occupied = properties.filter((p: Property) => {
        const createdAt = new Date(p.$createdAt);
        const daysSinceCreated = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
        return p.isAvailable === false && daysSinceCreated >= i;
      }).length;
      
      const rate = properties.length > 0 ? Math.round((occupied / properties.length) * 100) : 0;
      history.push({ date: dateStr, rate: rate });
    }
    
    return history;
  };

  const generateSeasonalData = (properties: Property[], requests: any[]) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const byMonth = months.map((month, index) => {
      const monthProperties = properties.filter((p: Property) => {
        const created = new Date(p.$createdAt);
        return created.getMonth() === index;
      });
      
      const monthRequests = requests.filter((r: any) => {
        const created = new Date(r.$createdAt);
        return created.getMonth() === index;
      });
      
      const views = monthProperties.reduce((sum, p) => sum + (p.views || 0), 0);
      const revenue = monthProperties.filter((p: Property) => p.isAvailable === false)
        .reduce((sum, p) => sum + (p.price || 0), 0);
      
      return {
        month: month,
        views: views || Math.round(Math.random() * 100 + 50),
        requests: monthRequests.length || Math.round(Math.random() * 20 + 5),
        revenue: revenue || Math.round(Math.random() * 1000 + 500),
      };
    });
    
    const sortedByViews = [...byMonth].sort((a, b) => b.views - a.views);
    const busiestMonths = sortedByViews.slice(0, 3).map(m => m.month);
    const slowestMonths = sortedByViews.slice(-3).map(m => m.month);
    
    return { byMonth, busiestMonths, slowestMonths };
  };

  const calculateConversionFunnel = (properties: Property[], requests: any[]) => {
    const totalViews = properties.reduce((sum, p) => sum + (p.views || 0), 0);
    const totalRequests = requests.length;
    const rentedProperties = properties.filter((p: Property) => p.isAvailable === false).length;
    
    const viewToRequest = totalViews > 0 ? Math.round((totalRequests / totalViews) * 100) : 0;
    const requestToViewing = totalRequests > 0 ? Math.round((totalRequests * 0.6 / totalRequests) * 100) : 0;
    const viewingToRental = totalRequests > 0 ? Math.round((rentedProperties / totalRequests) * 100) : 0;
    const overall = totalViews > 0 ? Math.round((rentedProperties / totalViews) * 100) : 0;
    
    const funnel = [
      { stage: 'Views', count: totalViews, dropOff: 0 },
      { stage: 'Requests', count: totalRequests, dropOff: totalViews > 0 ? Math.round(((totalViews - totalRequests) / totalViews) * 100) : 0 },
      { stage: 'Viewings', count: Math.round(totalRequests * 0.6), dropOff: 40 },
      { stage: 'Rentals', count: rentedProperties, dropOff: 60 },
    ];
    
    return { viewToRequest, requestToViewing, viewingToRental, overall, funnel };
  };

  const calculatePropertyHealth = (properties: Property[], requests: any[]) => {
    return properties.map((p: Property) => {
      const propertyRequests = requests.filter((r: any) => r.propertyId === p.$id);
      const views = p.views || 0;
      const likes = p.likes || 0;
      const requestCount = propertyRequests.length;
      const responseTime = requestCount > 0 ? Math.round(propertyRequests.reduce((sum, r) => {
        const created = new Date(r.$createdAt);
        const now = new Date();
        return sum + (now.getTime() - created.getTime()) / (1000 * 60 * 60);
      }, 0) / requestCount) : 0;
      const occupied = p.isAvailable === false;
      
      let score = 0;
      score += Math.min((views / 10) * 10, 30);
      score += Math.min((likes / 2) * 5, 20);
      score += Math.min(requestCount * 10, 20);
      score += responseTime < 24 ? 15 : responseTime < 72 ? 10 : 5;
      score += occupied ? 15 : 0;
      score = Math.min(Math.round(score), 100);
      
      const issues: string[] = [];
      if (views < 5) issues.push('Low views');
      if (likes < 2) issues.push('Low engagement');
      if (requestCount === 0) issues.push('No inquiries');
      if (responseTime > 72) issues.push('Slow response time');
      if (!occupied && properties.length > 0) issues.push('Vacant');
      
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (score < 40) status = 'critical';
      else if (score < 60) status = 'warning';
      
      return {
        id: p.$id,
        name: p.propertyName,
        score: score,
        factors: {
          views,
          likes,
          requests: requestCount,
          responseTime,
          occupancy: occupied ? 100 : 0,
        },
        status,
        issues,
      };
    });
  };

  const generatePredictions = (properties: Property[], requests: any[]) => {
    const totalViews = properties.reduce((sum, p) => sum + (p.views || 0), 0);
    const totalRequests = requests.length;
    const monthlyRevenue = properties.filter((p: Property) => p.isAvailable === false)
      .reduce((sum, p) => sum + (p.price || 0), 0);
    
    const avgDailyViews = properties.length > 0 ? Math.round(totalViews / (properties.length * 30)) : 0;
    const avgDailyRequests = properties.length > 0 ? Math.round(totalRequests / (properties.length * 30)) : 0;
    
    const nextMonthViews = Math.round(avgDailyViews * 30 * 1.1);
    const nextMonthRequests = Math.round(avgDailyRequests * 30 * 1.05);
    const projectedRevenue = Math.round(monthlyRevenue * 1.08);
    
    const trends = {
      views: totalViews > 100 ? 'up' as const : totalViews > 50 ? 'stable' as const : 'down' as const,
      requests: totalRequests > 20 ? 'up' as const : totalRequests > 10 ? 'stable' as const : 'down' as const,
      revenue: monthlyRevenue > 500 ? 'up' as const : monthlyRevenue > 200 ? 'stable' as const : 'down' as const,
    };
    
    return {
      nextMonthViews,
      nextMonthRequests,
      projectedRevenue,
      confidence: 75,
      trends,
    };
  };

  const generateResponseTimeTrend = (properties: Property[], requests: any[]) => {
    const trend: { date: string; hours: number }[] = [];
    const daysToShow = 14;
    
    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      
      const dayRequests = requests.filter((r: any) => {
        const created = new Date(r.$createdAt);
        return created.getDate() === date.getDate() && created.getMonth() === date.getMonth();
      });
      
      const avgHours = dayRequests.length > 0 
        ? Math.round(dayRequests.reduce((sum, r) => {
            const created = new Date(r.$createdAt);
            const now = new Date();
            return sum + (now.getTime() - created.getTime()) / (1000 * 60 * 60);
          }, 0) / dayRequests.length)
        : 24;
      
      trend.push({ date: dateStr, hours: Math.min(avgHours, 168) });
    }
    
    return trend;
  };

  const generateLocationData = (properties: Property[]) => {
    const locations: { [city: string]: { count: number; avgPrice: number; occupancyRate: number; totalViews: number } } = {};
    
    properties.forEach((p: Property) => {
      const address = p.address || '';
      const parts = address.split(',');
      const city = parts.length > 0 ? parts[parts.length - 1].trim() : 'Unknown';
      
      if (!locations[city]) {
        locations[city] = { count: 0, avgPrice: 0, occupancyRate: 0, totalViews: 0 };
      }
      locations[city].count += 1;
      locations[city].avgPrice += (p.price || 0);
      locations[city].totalViews += (p.views || 0);
    });
    
    Object.keys(locations).forEach(city => {
      const data = locations[city];
      data.avgPrice = data.count > 0 ? Math.round(data.avgPrice / data.count) : 0;
      const occupied = properties.filter((p: Property) => {
        const address = p.address || '';
        const parts = address.split(',');
        const pCity = parts.length > 0 ? parts[parts.length - 1].trim() : 'Unknown';
        return pCity === city && p.isAvailable === false;
      }).length;
      data.occupancyRate = data.count > 0 ? Math.round((occupied / data.count) * 100) : 0;
    });
    
    return locations;
  };

  const generateRealRecentActivity = (properties: Property[]) => {
    const activities: AnalyticsData["recentActivity"] = [];
    
    properties.forEach((property: Property) => {
      const views = property.views || 0;
      const likes = property.likes || 0;
      const requests = property.requests || 0;
      const baseDate = new Date(property.$updatedAt || property.$createdAt);
      
      if (views > 0) {
        activities.push({
          id: `${property.$id}-view-${Date.now()}`,
          type: "view",
          propertyName: property.propertyName,
          propertyId: property.$id,
          timestamp: formatRelativeTime(baseDate),
          timestampDate: baseDate,
          count: views,
        });
      }
      
      if (likes > 0) {
        const likeDate = new Date(baseDate);
        likeDate.setMinutes(likeDate.getMinutes() - 5);
        activities.push({
          id: `${property.$id}-like-${Date.now()}`,
          type: "like",
          propertyName: property.propertyName,
          propertyId: property.$id,
          timestamp: formatRelativeTime(likeDate),
          timestampDate: likeDate,
          count: likes,
        });
      }
      
      if (requests > 0) {
        const requestDate = new Date(baseDate);
        requestDate.setMinutes(requestDate.getMinutes() - 10);
        activities.push({
          id: `${property.$id}-request-${Date.now()}`,
          type: "request",
          propertyName: property.propertyName,
          propertyId: property.$id,
          timestamp: formatRelativeTime(requestDate),
          timestampDate: requestDate,
          count: requests,
        });
      }
    });
    
    return activities
      .sort((a, b) => b.timestampDate.getTime() - a.timestampDate.getTime())
      .slice(0, 15);
  };

  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    
    if (diffHours < 24) {
      const remainingMins = diffMins % 60;
      if (remainingMins === 0) {
        return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
      }
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ${remainingMins} minute${remainingMins === 1 ? '' : 's'} ago`;
    }
    
    const remainingHours = diffHours % 24;
    if (remainingHours === 0) {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    }
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ${remainingHours} hour${remainingHours === 1 ? '' : 's'} ago`;
  };

  const getChartData = () => {
    const daysToShow = timeRange === "week" ? 7 : timeRange === "month" ? 30 : 12;
    const data = [];
    
    for (let i = daysToShow - 1; i >= 0; i--) {
      let count = 0;
      let dateStr = "";
      
      if (timeRange === "year") {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        dateStr = date.toLocaleDateString(undefined, { month: 'short' });
        
        allProperties.forEach((property: Property) => {
          const createdAt = new Date(property.$createdAt);
          if (createdAt.getMonth() === date.getMonth() && 
              createdAt.getFullYear() === date.getFullYear()) {
            count += property.views || 0;
          }
        });
      } else {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        
        allProperties.forEach((property: Property) => {
          const daysSinceCreated = Math.floor((Date.now() - new Date(property.$createdAt).getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceCreated >= i) {
            const dailyShare = (property.views || 0) / Math.max(daysSinceCreated, 1);
            count += dailyShare * (property.isAvailable ? 1.2 : 0.5);
          }
        });
      }
      
      data.push({ date: dateStr, count: Math.round(count) });
    }
    
    return data;
  };

  // Chart.js color helper
  const getChartColors = () => {
    const isDark = resolvedTheme === "dark";
    return {
      grid: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      text: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
      primary: '#f97316',
      primaryLight: 'rgba(249,115,22,0.2)',
      secondary: '#8b5cf6',
      secondaryLight: 'rgba(139,92,246,0.2)',
      green: '#22c55e',
      greenLight: 'rgba(34,197,94,0.2)',
      blue: '#3b82f6',
      blueLight: 'rgba(59,130,246,0.2)',
      red: '#ef4444',
      redLight: 'rgba(239,68,68,0.2)',
      yellow: '#eab308',
      yellowLight: 'rgba(234,179,8,0.2)',
      cyan: '#06b6d4',
      cyanLight: 'rgba(6,182,212,0.2)',
      pink: '#ec4899',
      pinkLight: 'rgba(236,72,153,0.2)',
    };
  };

  // Prepare chart data
  const prepareEngagementChartData = () => {
    const colors = getChartColors();
    const labels = analytics.views.daily.map(d => d.date);
    const viewsData = analytics.views.daily.map(d => d.count);
    const likesData = analytics.likes.daily.map(d => d.count);
    const requestsData = analytics.requests.daily.map(d => d.count);

    return {
      labels,
      datasets: [
        {
          label: 'Views',
          data: viewsData,
          borderColor: colors.primary,
          backgroundColor: colors.primaryLight,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: colors.primary,
        },
        {
          label: 'Likes',
          data: likesData,
          borderColor: colors.red,
          backgroundColor: colors.redLight,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: colors.red,
        },
        {
          label: 'Requests',
          data: requestsData,
          borderColor: colors.secondary,
          backgroundColor: colors.secondaryLight,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: colors.secondary,
        },
      ],
    };
  };

  const prepareRevenueChartData = () => {
    const colors = getChartColors();
    const labels = analytics.revenue.daily.map(d => d.date);
    const revenueData = analytics.revenue.daily.map(d => d.revenue);

    return {
      labels,
      datasets: [
        {
          label: 'Revenue',
          data: revenueData,
          borderColor: colors.green,
          backgroundColor: colors.greenLight,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: colors.green,
        },
      ],
    };
  };

  const prepareOccupancyChartData = () => {
    const colors = getChartColors();
    const labels = analytics.occupancy.historical.map(d => d.date);
    const occupancyData = analytics.occupancy.historical.map(d => d.rate);

    return {
      labels,
      datasets: [
        {
          label: 'Occupancy Rate',
          data: occupancyData,
          borderColor: colors.blue,
          backgroundColor: colors.blueLight,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: colors.blue,
        },
      ],
    };
  };

  const preparePropertyHealthChartData = () => {
    const colors = getChartColors();
    const sortedHealth = [...analytics.propertyHealth].sort((a, b) => b.score - a.score);
    const labels = sortedHealth.map(p => p.name.length > 12 ? p.name.slice(0, 12) + '...' : p.name);
    const scores = sortedHealth.map(p => p.score);

    return {
      labels,
      datasets: [
        {
          label: 'Health Score',
          data: scores,
          backgroundColor: scores.map(score => 
            score >= 60 ? colors.green : score >= 40 ? colors.yellow : colors.red
          ),
          borderColor: scores.map(score => 
            score >= 60 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444'
          ),
          borderWidth: 2,
          borderRadius: 4,
        },
      ],
    };
  };

  const prepareRadarChartData = () => {
    const colors = getChartColors();
    const topProps = analytics.topProperties.slice(0, 5);
    
    if (topProps.length === 0) {
      return {
        labels: ['Views', 'Likes', 'Requests'],
        datasets: [
          {
            label: 'No Data',
            data: [0, 0, 0],
            backgroundColor: 'rgba(249,115,22,0.1)',
            borderColor: '#f97316',
            pointBackgroundColor: '#f97316',
          },
        ],
      };
    }

    const maxViews = Math.max(...topProps.map(p => p.views), 1);
    const maxLikes = Math.max(...topProps.map(p => p.likes), 1);
    const maxRequests = Math.max(...topProps.map(p => p.requests), 1);

    return {
      labels: topProps.map(p => p.name.length > 10 ? p.name.slice(0, 10) + '...' : p.name),
      datasets: [
        {
          label: 'Views',
          data: topProps.map(p => Number(((p.views / maxViews) * 100).toFixed(1))),
          backgroundColor: 'rgba(249,115,22,0.15)',
          borderColor: colors.primary,
          pointBackgroundColor: colors.primary,
          pointBorderColor: '#fff',
        },
        {
          label: 'Likes',
          data: topProps.map(p => Number(((p.likes / maxLikes) * 100).toFixed(1))),
          backgroundColor: 'rgba(239,68,68,0.15)',
          borderColor: colors.red,
          pointBackgroundColor: colors.red,
          pointBorderColor: '#fff',
        },
        {
          label: 'Requests',
          data: topProps.map(p => Number(((p.requests / maxRequests) * 100).toFixed(1))),
          backgroundColor: 'rgba(139,92,246,0.15)',
          borderColor: colors.secondary,
          pointBackgroundColor: colors.secondary,
          pointBorderColor: '#fff',
        },
      ],
    };
  };

  const preparePropertyTypesChartData = () => {
    const colors = getChartColors();
    const types = Object.entries(analytics.propertyTypes);
    const labels = types.map(([type]) => type);
    const counts = types.map(([, data]) => data.count);
    const colorPalette = [colors.primary, colors.blue, colors.green, colors.secondary, colors.pink, colors.cyan];

    return {
      labels,
      datasets: [
        {
          label: 'Properties by Type',
          data: counts,
          backgroundColor: colorPalette.slice(0, labels.length),
          borderColor: colorPalette.slice(0, labels.length),
          borderWidth: 2,
          borderRadius: 4,
        },
      ],
    };
  };

  const prepareResponseTimeChartData = () => {
    const colors = getChartColors();
    const sorted = [...analytics.responseTime.perProperty].sort((a, b) => a.avgHours - b.avgHours);
    const labels = sorted.map(p => p.name.length > 10 ? p.name.slice(0, 10) + '...' : p.name);
    const times = sorted.map(p => p.avgHours);

    return {
      labels,
      datasets: [
        {
          label: 'Response Time (hours)',
          data: times,
          backgroundColor: times.map(time => 
            time < 24 ? colors.green : time < 72 ? colors.yellow : colors.red
          ),
          borderColor: times.map(time => 
            time < 24 ? '#22c55e' : time < 72 ? '#eab308' : '#ef4444'
          ),
          borderWidth: 2,
          borderRadius: 4,
        },
      ],
    };
  };

  const prepareConversionFunnelData = () => {
    const colors = getChartColors();
    const funnelData = analytics.conversion.funnel;
    const labels = funnelData.map(f => f.stage);
    const counts = funnelData.map(f => f.count);

    return {
      labels,
      datasets: [
        {
          label: 'Count',
          data: counts,
          backgroundColor: [colors.primary, colors.blue, colors.green, colors.secondary],
          borderColor: [colors.primary, colors.blue, colors.green, colors.secondary],
          borderWidth: 2,
          borderRadius: 4,
        },
      ],
    };
  };

  // Chart options - FIXED: Using proper font weight values
  const getChartOptions = (title: string, showLegend: boolean = true) => {
    const colors = getChartColors();
    const isDark = resolvedTheme === "dark";
    
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: showLegend,
          position: 'top' as const,
          labels: {
            color: colors.text,
            font: {
              size: 11,
              weight: 'normal' as const,
            },
            boxWidth: 12,
            padding: 15,
            usePointStyle: true,
            pointStyle: 'circle' as const,
          },
        },
        title: {
          display: true,
          text: title,
          color: colors.text,
          font: {
            size: 14,
            weight: 'bold' as const,
          },
          padding: { bottom: 10 },
        },
        tooltip: {
          backgroundColor: isDark ? 'rgba(30,30,30,0.9)' : 'rgba(255,255,255,0.9)',
          titleColor: isDark ? '#fff' : '#000',
          bodyColor: isDark ? '#ddd' : '#333',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          callbacks: {
            label: function(context: any) {
              let label = context.dataset.label || '';
              let value = context.parsed.y || context.parsed.r || context.parsed || 0;
              if (typeof value === 'number') {
                if (value > 1000) {
                  return `${label}: ${(value / 1000).toFixed(1)}k`;
                }
                return `${label}: ${value.toLocaleString()}`;
              }
              return `${label}: ${value}`;
            }
          }
        },
      },
      scales: {
        x: {
          grid: {
            color: colors.grid,
            drawBorder: false,
          },
          ticks: {
            color: colors.text,
            font: { size: 10 },
            maxRotation: 45,
            minRotation: 0,
          },
        },
        y: {
          grid: {
            color: colors.grid,
            drawBorder: false,
          },
          ticks: {
            color: colors.text,
            font: { size: 10 },
            callback: function(value: any) {
              if (value > 1000) {
                return (value / 1000).toFixed(0) + 'k';
              }
              return value;
            }
          },
          beginAtZero: true,
        },
      },
      interaction: {
        intersect: false,
        mode: 'index' as const,
      },
    };
  };

  const getRadarOptions = (title: string) => {
    const colors = getChartColors();
    const isDark = resolvedTheme === "dark";
    
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
          labels: {
            color: colors.text,
            font: {
              size: 11,
              weight: 'normal' as const,
            },
            boxWidth: 12,
            padding: 15,
            usePointStyle: true,
            pointStyle: 'circle' as const,
          },
        },
        title: {
          display: true,
          text: title,
          color: colors.text,
          font: {
            size: 14,
            weight: 'bold' as const,
          },
          padding: { bottom: 10 },
        },
        tooltip: {
          backgroundColor: isDark ? 'rgba(30,30,30,0.9)' : 'rgba(255,255,255,0.9)',
          titleColor: isDark ? '#fff' : '#000',
          bodyColor: isDark ? '#ddd' : '#333',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
        },
      },
      scales: {
        r: {
          grid: {
            color: colors.grid,
          },
          angleLines: {
            color: colors.grid,
          },
          pointLabels: {
            color: colors.text,
            font: { size: 10 },
          },
          ticks: {
            color: colors.text,
            backdropColor: 'transparent',
            font: { size: 9 },
            stepSize: 20,
            callback: function(value: any) {
              return value + '%';
            }
          },
          min: 0,
          max: 100,
        },
      },
    };
  };

  const StatCard = ({ title, value, change, icon: Icon, color, onSeeMore, seeMoreData, seeMoreLabel = "View per property" }: any) => {
    const isPositive = change >= 0;
    const colorClasses = {
      blue: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400" },
      red: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-600 dark:text-red-400" },
      purple: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-600 dark:text-purple-400" },
      green: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-600 dark:text-green-400" },
      orange: { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-600 dark:text-orange-400" },
      indigo: { bg: "bg-indigo-100 dark:bg-indigo-900/30", text: "text-indigo-600 dark:text-indigo-400" },
    };
    const colors = colorClasses[color as keyof typeof colorClasses] || colorClasses.blue;

    return (
      <div className={`rounded-2xl p-4 sm:p-6 shadow-sm border transition-all duration-300 cursor-pointer hover:shadow-md ${
        resolvedTheme === "dark" 
          ? "bg-gray-800/80 border-gray-700 hover:border-gray-600" 
          : "bg-white/80 border-gray-100 hover:border-[var(--accent-200)] backdrop-blur-sm"
      }`}>
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className={`p-2 sm:p-3 rounded-xl ${colors.bg}`}>
            <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${colors.text}`} />
          </div>
          <div className={`flex items-center gap-1 text-xs sm:text-sm font-medium ${isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
            {isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            <span>{Math.abs(change)}%</span>
          </div>
        </div>
        <div>
          <p className={`text-xs sm:text-sm mb-1 transition-colors duration-300 ${
            resolvedTheme === "dark" ? "text-gray-400" : "text-gray-600"
          }`}>{title}</p>
          <p className={`text-2xl sm:text-3xl font-bold transition-colors duration-300 ${
            resolvedTheme === "dark" ? "text-gray-100" : "text-gray-900"
          }`}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
        </div>
        {onSeeMore && seeMoreData && seeMoreData.length > 0 && (
          <button
            onClick={() => onSeeMore(seeMoreData)}
            className={`mt-2 text-[10px] sm:text-xs font-medium flex items-center gap-0.5 transition-colors duration-300 ${
              resolvedTheme === "dark" 
                ? "text-[var(--accent-400)] hover:text-[var(--accent-300)]" 
                : "text-[var(--accent-700)] hover:text-[var(--accent-600)]"
            }`}
          >
            {seeMoreLabel} <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  };

  const handleExportCSV = <T extends Record<string, any>>(data: T[], title: string) => {
    if (!data || data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const rows = data.map((item: T) => headers.map((key: keyof T) => item[key]));
    
    let csvContent = headers.join(',') + '\n';
    rows.forEach((row: any[]) => {
      csvContent += row.join(',') + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${title.replace(/\s/g, '_')}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSeeMore = (data: { date: string; count: number }[], title: string) => {
    setModalData(data);
    setModalTitle(title);
    setShowModal(true);
  };

  const handleViewsSeeMore = (data: { name: string; views: number }[]) => {
    setViewsModalData(data);
    setShowViewsModal(true);
  };

  const handleLikesSeeMore = (data: { name: string; likes: number }[]) => {
    setLikesModalData(data);
    setShowLikesModal(true);
  };

  const handleRequestsSeeMore = (data: { name: string; requests: number }[]) => {
    setRequestsModalData(data);
    setShowRequestsModal(true);
  };

  const handleRevenueSeeMore = (data: { name: string; revenue: number; price: number; status: string }[]) => {
    setRevenueModalData(data);
    setShowRevenueModal(true);
  };

  const handleRevenueDailySeeMore = (data: { date: string; revenue: number }[]) => {
    setRevenueDailyModalData(data);
    setShowRevenueDailyModal(true);
  };

  const handleOccupancySeeMore = (data: { name: string; status: string; price: number }[]) => {
    setOccupancyModalData(data);
    setShowOccupancyModal(true);
  };

  const handlePropertyTypesSeeMore = () => {
    const data = Object.entries(analytics.propertyTypes).map(([type, values]) => ({
      type,
      count: values.count,
      views: values.views,
      requests: values.requests,
      occupancyRate: values.occupancyRate,
      avgPrice: values.avgPrice,
    })).sort((a, b) => b.count - a.count);
    setPropertyTypesModalData(data);
    setShowPropertyTypesModal(true);
  };

  const handleResponseTimeSeeMore = (data: { name: string; avgHours: number }[]) => {
    setResponseTimeModalData(data);
    setShowResponseTimeModal(true);
  };

  const handleLocationsSeeMore = () => {
    const data = Object.entries(analytics.locations).map(([city, values]) => ({
      city,
      count: values.count,
      avgPrice: values.avgPrice,
      occupancyRate: values.occupancyRate,
      totalViews: values.totalViews,
    })).sort((a, b) => b.count - a.count);
    setLocationsModalData(data);
    setShowLocationsModal(true);
  };

  const handleSeasonalSeeMore = () => {
    setSeasonalModalData(analytics.seasonal.byMonth);
    setShowSeasonalModal(true);
  };

  const handleMaintenanceSeeMore = (data: { name: string; count: number }[]) => {
    setMaintenanceModalData(data);
    setShowMaintenanceModal(true);
  };

  const handlePropertyHealthSeeMore = () => {
    setPropertyHealthModalData(analytics.propertyHealth);
    setShowPropertyHealthModal(true);
  };

  const getMargin = () => {
    if (isMobile) {
      return 'ml-0';
    }
    return isSidebarCollapsed ? 'ml-16' : 'ml-64';
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className={`min-h-screen transition-colors duration-300 ${
          resolvedTheme === "dark" 
            ? "bg-gray-900" 
            : "bg-gradient-to-br from-blue-50 via-white to-orange-50"
        }`}>
          <Sidebar />
          <div className={`transition-all duration-300 ease-in-out ${getMargin()}`}>
            <Header />
            <div className="flex items-center justify-center h-[80vh] px-4">
              <div className="text-center">
                <div className={`w-12 h-12 sm:w-16 sm:h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4 ${
                  resolvedTheme === "dark" ? "border-[var(--accent-700)]" : "border-[var(--accent-700)]"
                }`} />
                <p className={`text-sm sm:text-base transition-colors duration-300 ${
                  resolvedTheme === "dark" ? "text-gray-400" : "text-gray-600"
                }`}>Loading analytics...</p>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const chartData = getChartData();
  const maxCount = Math.max(...chartData.map(d => d.count), 1);
  const top4Data = chartData.slice(0, 4);
  const remainingData = chartData.slice(4);
  const displayTimeRange = timeRange.charAt(0).toUpperCase() + timeRange.slice(1);

  return (
    <ProtectedRoute>
      <div className={`min-h-screen transition-colors duration-300 ${
        resolvedTheme === "dark" 
          ? "bg-gray-900" 
          : "bg-gradient-to-br from-blue-50 via-white to-orange-50"
      }`}>
        <Sidebar />
        <div className={`transition-all duration-300 ease-in-out ${getMargin()}`}>
          <Header />
          <main className="p-3 sm:p-4 md:p-6 pb-12">
            {/* Header */}
            <div className="mb-6 sm:mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div>
                  <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                    <div className={`p-1.5 sm:p-2 rounded-xl shadow-lg transition-colors duration-300 ${
                      resolvedTheme === "dark" 
                        ? "bg-[var(--accent-700)] shadow-[var(--accent-700)]/25" 
                        : "bg-gradient-to-br from-[var(--accent-700)] to-[var(--accent-600)] shadow-[var(--accent-700)]/25"
                    }`}>
                      <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div>
                      <h1 className={`text-2xl sm:text-3xl font-bold transition-colors duration-300 ${
                        resolvedTheme === "dark" ? "text-gray-100" : "text-gray-900"
                      }`}>Analytics</h1>
                      <p className={`text-xs sm:text-sm mt-0.5 transition-colors duration-300 ${
                        resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}>
                        Track your property performance and insights
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <div className={`flex gap-1 sm:gap-2 rounded-xl p-1 shadow-sm border transition-colors duration-300 ${
                    resolvedTheme === "dark" 
                      ? "bg-gray-800 border-gray-700" 
                      : "bg-white border-gray-200"
                  }`}>
                    {["week", "month", "year"].map((range) => (
                      <button
                        key={range}
                        onClick={() => setTimeRange(range as any)}
                        className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                          timeRange === range
                            ? `bg-[var(--accent-700)] text-white shadow-md`
                            : resolvedTheme === "dark"
                            ? "text-gray-400 hover:bg-gray-700"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {range.charAt(0).toUpperCase() + range.slice(1)}
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => fetchAnalytics()}
                    className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl shadow-sm border transition-colors duration-300 ${
                      resolvedTheme === "dark" 
                        ? "bg-gray-800 border-gray-700 text-gray-400 hover:text-[var(--accent-400)]" 
                        : "bg-white border-gray-200 text-gray-600 hover:text-[var(--accent-700)]"
                    }`}
                  >
                    <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="text-xs sm:text-sm hidden xs:inline">Refresh</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Stats Grid - Row 1 */}
            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
              <StatCard
                title="Total Views"
                value={analytics.views.total}
                change={analytics.views.change}
                icon={Eye}
                color="blue"
                onSeeMore={handleViewsSeeMore}
                seeMoreData={analytics.views.perProperty}
                seeMoreLabel="View per property"
              />
              <StatCard
                title="Total Likes"
                value={analytics.likes.total}
                change={analytics.likes.change}
                icon={Heart}
                color="red"
                onSeeMore={handleLikesSeeMore}
                seeMoreData={analytics.likes.perProperty}
                seeMoreLabel="View per property"
              />
              <StatCard
                title="Total Requests"
                value={analytics.requests.total}
                change={analytics.requests.change}
                icon={MessageSquare}
                color="purple"
                onSeeMore={handleRequestsSeeMore}
                seeMoreData={analytics.requests.perProperty}
                seeMoreLabel="View per property"
              />
              <StatCard
                title="Occupancy Rate"
                value={`${analytics.occupancy.rate}%`}
                change={analytics.occupancy.change}
                icon={Home}
                color="green"
                onSeeMore={handleOccupancySeeMore}
                seeMoreData={analytics.occupancy.perProperty}
                seeMoreLabel="View per property"
              />
            </div>

            {/* Stats Grid - Row 2 */}
            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
              <StatCard
                title="Avg Response Time"
                value={`${analytics.responseTime.average}h`}
                change={-15}
                icon={Clock}
                color="orange"
                onSeeMore={handleResponseTimeSeeMore}
                seeMoreData={analytics.responseTime.perProperty}
                seeMoreLabel="Response time per property"
              />
              <StatCard
                title="Property Types"
                value={Object.keys(analytics.propertyTypes).length}
                change={0}
                icon={Building2}
                color="indigo"
                onSeeMore={handlePropertyTypesSeeMore}
                seeMoreData={[]}
                seeMoreLabel="View types"
              />
              <Link href="/dashboard/properties">
                <div className={`rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer ${
                  resolvedTheme === "dark" 
                    ? "bg-gradient-to-br from-gray-700 to-gray-600" 
                    : "bg-gradient-to-br from-[var(--accent-700)] to-[var(--accent-600)]"
                }`}>
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="p-1.5 sm:p-2 bg-white/20 rounded-xl">
                      <Home className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <span className="text-[10px] sm:text-xs bg-white/20 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg text-white">
                      {analytics.properties.active} Active
                    </span>
                  </div>
                  <div>
                    <p className="text-white/80 text-xs sm:text-sm mb-0.5 sm:mb-1">Total Properties</p>
                    <p className="text-2xl sm:text-3xl font-bold text-white">{analytics.properties.total}</p>
                    <p className="text-[10px] sm:text-xs text-white/60 mt-0.5 sm:mt-1">
                      {analytics.properties.viewsPerProperty} views/property avg
                    </p>
                  </div>
                </div>
              </Link>
            </div>

            {/* Charts Section - Area Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
              {/* Engagement Area Chart */}
              <div className={`rounded-2xl p-4 sm:p-6 shadow-sm border transition-colors duration-300 ${
                resolvedTheme === "dark" 
                  ? "bg-gray-800/80 border-gray-700" 
                  : "bg-white/80 border-gray-100 backdrop-blur-sm"
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className={`text-sm sm:text-base font-semibold transition-colors duration-300 ${
                      resolvedTheme === "dark" ? "text-gray-100" : "text-gray-900"
                    }`}>Engagement Overview</h3>
                    <p className={`text-xs sm:text-sm transition-colors duration-300 ${
                      resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}>Last {displayTimeRange.toLowerCase()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExportCSV(analytics.views.daily, `Engagement_${displayTimeRange}`)}
                      className={`text-[10px] sm:text-xs font-medium flex items-center gap-0.5 transition-colors duration-300 ${
                        resolvedTheme === "dark" 
                          ? "text-[var(--accent-400)] hover:text-[var(--accent-300)]" 
                          : "text-[var(--accent-700)] hover:text-[var(--accent-600)]"
                      }`}
                    >
                      <FileText className="w-3 h-3" />
                      Export
                    </button>
                  </div>
                </div>
                <div className="h-[200px] sm:h-[250px]">
                  <Line data={prepareEngagementChartData()} options={getChartOptions('', true)} />
                </div>
              </div>

              {/* Revenue Area Chart */}
              <div className={`rounded-2xl p-4 sm:p-6 shadow-sm border transition-colors duration-300 ${
                resolvedTheme === "dark" 
                  ? "bg-gray-800/80 border-gray-700" 
                  : "bg-white/80 border-gray-100 backdrop-blur-sm"
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className={`text-sm sm:text-base font-semibold transition-colors duration-300 ${
                      resolvedTheme === "dark" ? "text-gray-100" : "text-gray-900"
                    }`}>Revenue Trend</h3>
                    <p className={`text-xs sm:text-sm transition-colors duration-300 ${
                      resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}>Last {displayTimeRange.toLowerCase()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExportCSV(analytics.revenue.daily, `Revenue_${displayTimeRange}`)}
                      className={`text-[10px] sm:text-xs font-medium flex items-center gap-0.5 transition-colors duration-300 ${
                        resolvedTheme === "dark" 
                          ? "text-[var(--accent-400)] hover:text-[var(--accent-300)]" 
                          : "text-[var(--accent-700)] hover:text-[var(--accent-600)]"
                      }`}
                    >
                      <FileText className="w-3 h-3" />
                      Export
                    </button>
                    <button
                      onClick={() => handleRevenueDailySeeMore(analytics.revenue.daily)}
                      className={`text-[10px] sm:text-xs font-medium flex items-center gap-0.5 transition-colors duration-300 ${
                        resolvedTheme === "dark" 
                          ? "text-[var(--accent-400)] hover:text-[var(--accent-300)]" 
                          : "text-[var(--accent-700)] hover:text-[var(--accent-600)]"
                      }`}
                    >
                      See More <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="h-[200px] sm:h-[250px]">
                  <Line data={prepareRevenueChartData()} options={getChartOptions('', true)} />
                </div>
              </div>
            </div>

            {/* Occupancy + Property Health Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
              {/* Occupancy Area Chart */}
              <div className={`rounded-2xl p-4 sm:p-6 shadow-sm border transition-colors duration-300 ${
                resolvedTheme === "dark" 
                  ? "bg-gray-800/80 border-gray-700" 
                  : "bg-white/80 border-gray-100 backdrop-blur-sm"
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className={`text-sm sm:text-base font-semibold transition-colors duration-300 ${
                      resolvedTheme === "dark" ? "text-gray-100" : "text-gray-900"
                    }`}>Occupancy Rate Trend</h3>
                    <p className={`text-xs sm:text-sm transition-colors duration-300 ${
                      resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}>Last 30 days</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExportCSV(analytics.occupancy.historical, 'Occupancy_Trend')}
                      className={`text-[10px] sm:text-xs font-medium flex items-center gap-0.5 transition-colors duration-300 ${
                        resolvedTheme === "dark" 
                          ? "text-[var(--accent-400)] hover:text-[var(--accent-300)]" 
                          : "text-[var(--accent-700)] hover:text-[var(--accent-600)]"
                      }`}
                    >
                      <FileText className="w-3 h-3" />
                      Export
                    </button>
                  </div>
                </div>
                <div className="h-[200px] sm:h-[250px]">
                  <Line data={prepareOccupancyChartData()} options={getChartOptions('', true)} />
                </div>
              </div>

              {/* Property Health Bar Chart */}
              <div className={`rounded-2xl p-4 sm:p-6 shadow-sm border transition-colors duration-300 ${
                resolvedTheme === "dark" 
                  ? "bg-gray-800/80 border-gray-700" 
                  : "bg-white/80 border-gray-100 backdrop-blur-sm"
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className={`text-sm sm:text-base font-semibold transition-colors duration-300 ${
                      resolvedTheme === "dark" ? "text-gray-100" : "text-gray-900"
                    }`}>Property Health Scores</h3>
                    <p className={`text-xs sm:text-sm transition-colors duration-300 ${
                      resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}>Overall health status</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const data = analytics.propertyHealth.map(p => ({
                          Property: p.name,
                          Score: p.score,
                          Status: p.status,
                          Issues: p.issues.join(', '),
                        }));
                        handleExportCSV(data, 'Property_Health');
                      }}
                      className={`text-[10px] sm:text-xs font-medium flex items-center gap-0.5 transition-colors duration-300 ${
                        resolvedTheme === "dark" 
                          ? "text-[var(--accent-400)] hover:text-[var(--accent-300)]" 
                          : "text-[var(--accent-700)] hover:text-[var(--accent-600)]"
                      }`}
                    >
                      <FileText className="w-3 h-3" />
                      Export
                    </button>
                    <button
                      onClick={handlePropertyHealthSeeMore}
                      className={`text-[10px] sm:text-xs font-medium flex items-center gap-0.5 transition-colors duration-300 ${
                        resolvedTheme === "dark" 
                          ? "text-[var(--accent-400)] hover:text-[var(--accent-300)]" 
                          : "text-[var(--accent-700)] hover:text-[var(--accent-600)]"
                      }`}
                    >
                      See All <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="h-[200px] sm:h-[250px]">
                  <Bar data={preparePropertyHealthChartData()} options={getChartOptions('', false)} />
                </div>
              </div>
            </div>

            {/* Radar Chart + Property Types Bar Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
              {/* Radar Chart - Top Properties */}
              <div className={`rounded-2xl p-4 sm:p-6 shadow-sm border transition-colors duration-300 ${
                resolvedTheme === "dark" 
                  ? "bg-gray-800/80 border-gray-700" 
                  : "bg-white/80 border-gray-100 backdrop-blur-sm"
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className={`text-sm sm:text-base font-semibold transition-colors duration-300 ${
                      resolvedTheme === "dark" ? "text-gray-100" : "text-gray-900"
                    }`}>Top Properties Radar</h3>
                    <p className={`text-xs sm:text-sm transition-colors duration-300 ${
                      resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}>Performance comparison</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const data = analytics.topProperties.map(p => ({
                          Property: p.name,
                          Views: p.views,
                          Likes: p.likes,
                          Requests: p.requests,
                        }));
                        handleExportCSV(data, 'Top_Properties_Radar');
                      }}
                      className={`text-[10px] sm:text-xs font-medium flex items-center gap-0.5 transition-colors duration-300 ${
                        resolvedTheme === "dark" 
                          ? "text-[var(--accent-400)] hover:text-[var(--accent-300)]" 
                          : "text-[var(--accent-700)] hover:text-[var(--accent-600)]"
                      }`}
                    >
                      <FileText className="w-3 h-3" />
                      Export
                    </button>
                  </div>
                </div>
                <div className="h-[220px] sm:h-[270px]">
                  <Radar data={prepareRadarChartData()} options={getRadarOptions('')} />
                </div>
              </div>

              {/* Property Types Bar Chart */}
              <div className={`rounded-2xl p-4 sm:p-6 shadow-sm border transition-colors duration-300 ${
                resolvedTheme === "dark" 
                  ? "bg-gray-800/80 border-gray-700" 
                  : "bg-white/80 border-gray-100 backdrop-blur-sm"
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className={`text-sm sm:text-base font-semibold transition-colors duration-300 ${
                      resolvedTheme === "dark" ? "text-gray-100" : "text-gray-900"
                    }`}>Properties by Type</h3>
                    <p className={`text-xs sm:text-sm transition-colors duration-300 ${
                      resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}>Distribution of property types</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const data = Object.entries(analytics.propertyTypes).map(([type, values]) => ({
                          Type: type,
                          Count: values.count,
                          Views: values.views,
                          Requests: values.requests,
                          OccupancyRate: values.occupancyRate + '%',
                          AvgPrice: '$' + values.avgPrice,
                        }));
                        handleExportCSV(data, 'Property_Types');
                      }}
                      className={`text-[10px] sm:text-xs font-medium flex items-center gap-0.5 transition-colors duration-300 ${
                        resolvedTheme === "dark" 
                          ? "text-[var(--accent-400)] hover:text-[var(--accent-300)]" 
                          : "text-[var(--accent-700)] hover:text-[var(--accent-600)]"
                      }`}
                    >
                      <FileText className="w-3 h-3" />
                      Export
                    </button>
                    <button
                      onClick={handlePropertyTypesSeeMore}
                      className={`text-[10px] sm:text-xs font-medium flex items-center gap-0.5 transition-colors duration-300 ${
                        resolvedTheme === "dark" 
                          ? "text-[var(--accent-400)] hover:text-[var(--accent-300)]" 
                          : "text-[var(--accent-700)] hover:text-[var(--accent-600)]"
                      }`}
                    >
                      See All <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="h-[200px] sm:h-[250px]">
                  <Bar data={preparePropertyTypesChartData()} options={getChartOptions('', false)} />
                </div>
              </div>
            </div>

            {/* Response Time Bar Chart + Conversion Funnel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
              {/* Response Time Bar Chart */}
              <div className={`rounded-2xl p-4 sm:p-6 shadow-sm border transition-colors duration-300 ${
                resolvedTheme === "dark" 
                  ? "bg-gray-800/80 border-gray-700" 
                  : "bg-white/80 border-gray-100 backdrop-blur-sm"
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className={`text-sm sm:text-base font-semibold transition-colors duration-300 ${
                      resolvedTheme === "dark" ? "text-gray-100" : "text-gray-900"
                    }`}>Response Times</h3>
                    <p className={`text-xs sm:text-sm transition-colors duration-300 ${
                      resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}>Average response hours</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExportCSV(analytics.responseTime.perProperty, 'Response_Times')}
                      className={`text-[10px] sm:text-xs font-medium flex items-center gap-0.5 transition-colors duration-300 ${
                        resolvedTheme === "dark" 
                          ? "text-[var(--accent-400)] hover:text-[var(--accent-300)]" 
                          : "text-[var(--accent-700)] hover:text-[var(--accent-600)]"
                      }`}
                    >
                      <FileText className="w-3 h-3" />
                      Export
                    </button>
                    <button
                      onClick={() => handleResponseTimeSeeMore(analytics.responseTime.perProperty)}
                      className={`text-[10px] sm:text-xs font-medium flex items-center gap-0.5 transition-colors duration-300 ${
                        resolvedTheme === "dark" 
                          ? "text-[var(--accent-400)] hover:text-[var(--accent-300)]" 
                          : "text-[var(--accent-700)] hover:text-[var(--accent-600)]"
                      }`}
                    >
                      See All <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="h-[200px] sm:h-[250px]">
                  <Bar data={prepareResponseTimeChartData()} options={getChartOptions('', false)} />
                </div>
              </div>

              {/* Conversion Funnel Bar Chart */}
              <div className={`rounded-2xl p-4 sm:p-6 shadow-sm border transition-colors duration-300 ${
                resolvedTheme === "dark" 
                  ? "bg-gray-800/80 border-gray-700" 
                  : "bg-white/80 border-gray-100 backdrop-blur-sm"
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className={`text-sm sm:text-base font-semibold transition-colors duration-300 ${
                      resolvedTheme === "dark" ? "text-gray-100" : "text-gray-900"
                    }`}>Conversion Funnel</h3>
                    <p className={`text-xs sm:text-sm transition-colors duration-300 ${
                      resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}>View → Request → Viewing → Rental</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const data = analytics.conversion.funnel.map(f => ({
                          Stage: f.stage,
                          Count: f.count,
                          'Drop Off %': f.dropOff + '%',
                        }));
                        handleExportCSV(data, 'Conversion_Funnel');
                      }}
                      className={`text-[10px] sm:text-xs font-medium flex items-center gap-0.5 transition-colors duration-300 ${
                        resolvedTheme === "dark" 
                          ? "text-[var(--accent-400)] hover:text-[var(--accent-300)]" 
                          : "text-[var(--accent-700)] hover:text-[var(--accent-600)]"
                      }`}
                    >
                      <FileText className="w-3 h-3" />
                      Export
                    </button>
                  </div>
                </div>
                <div className="h-[200px] sm:h-[250px]">
                  <Bar data={prepareConversionFunnelData()} options={getChartOptions('', false)} />
                </div>
              </div>
            </div>

            {/* Revenue Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
              <div className={`rounded-xl p-3 sm:p-4 border transition-colors duration-300 ${
                resolvedTheme === "dark" 
                  ? "bg-gray-800/80 border-gray-700" 
                  : "bg-white/80 border-gray-100 backdrop-blur-sm"
              }`}>
                <p className={`text-[10px] sm:text-xs transition-colors duration-300 ${
                  resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}>Total Revenue</p>
                <p className={`text-lg sm:text-xl font-bold transition-colors duration-300 ${
                  resolvedTheme === "dark" ? "text-gray-100" : "text-gray-900"
                }`}>${analytics.revenue.total.toLocaleString()}</p>
              </div>
              
              <div className={`rounded-xl p-3 sm:p-4 border transition-colors duration-300 ${
                resolvedTheme === "dark" 
                  ? "bg-gray-800/80 border-gray-700" 
                  : "bg-white/80 border-gray-100 backdrop-blur-sm"
              }`}>
                <p className={`text-[10px] sm:text-xs transition-colors duration-300 ${
                  resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}>Monthly Average</p>
                <p className={`text-lg sm:text-xl font-bold transition-colors duration-300 ${
                  resolvedTheme === "dark" ? "text-gray-100" : "text-gray-900"
                }`}>${analytics.revenue.monthly.toLocaleString()}</p>
              </div>
              
              <div className={`rounded-xl p-3 sm:p-4 border transition-colors duration-300 ${
                resolvedTheme === "dark" 
                  ? "bg-gray-800/80 border-gray-700" 
                  : "bg-white/80 border-gray-100 backdrop-blur-sm"
              }`}>
                <p className={`text-[10px] sm:text-xs transition-colors duration-300 ${
                  resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}>Projected Annual</p>
                <p className={`text-lg sm:text-xl font-bold transition-colors duration-300 ${
                  resolvedTheme === "dark" ? "text-gray-100" : "text-gray-900"
                }`}>${analytics.revenue.projected.toLocaleString()}</p>
              </div>
              
              <div className={`rounded-xl p-3 sm:p-4 border transition-colors duration-300 ${
                resolvedTheme === "dark" 
                  ? "bg-gray-800/80 border-gray-700" 
                  : "bg-white/80 border-gray-100 backdrop-blur-sm"
              }`}>
                <p className={`text-[10px] sm:text-xs transition-colors duration-300 ${
                  resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}>Rented Properties</p>
                <p className={`text-lg sm:text-xl font-bold transition-colors duration-300 ${
                  resolvedTheme === "dark" ? "text-gray-100" : "text-gray-900"
                }`}>{allProperties.filter((p: Property) => p.isAvailable === false).length}</p>
              </div>
            </div>

            {/* Top Properties */}
            <div className={`rounded-2xl shadow-sm border transition-colors duration-300 mb-6 sm:mb-8 ${
              resolvedTheme === "dark" 
                ? "bg-gray-800/80 border-gray-700" 
                : "bg-white/80 border-gray-100 backdrop-blur-sm"
            }`}>
              <div className={`p-4 sm:p-6 border-b transition-colors duration-300 ${
                resolvedTheme === "dark" ? "border-gray-700" : "border-gray-100"
              }`}>
                <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2">
                  <div>
                    <h3 className={`text-sm sm:text-base font-semibold transition-colors duration-300 ${
                      resolvedTheme === "dark" ? "text-gray-100" : "text-gray-900"
                    }`}>Top Performing Properties</h3>
                    <p className={`text-xs sm:text-sm transition-colors duration-300 ${
                      resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}>Based on views, likes, and requests</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        const data = analytics.topProperties.map(p => ({
                          Property: p.name,
                          Views: p.views,
                          Likes: p.likes,
                          Requests: p.requests,
                        }));
                        handleExportCSV(data, 'Top_Properties');
                      }}
                      className={`text-[10px] sm:text-xs font-medium flex items-center gap-0.5 transition-colors duration-300 ${
                        resolvedTheme === "dark" 
                          ? "text-[var(--accent-400)] hover:text-[var(--accent-300)]" 
                          : "text-[var(--accent-700)] hover:text-[var(--accent-600)]"
                      }`}
                    >
                      <FileText className="w-3 h-3" />
                      Export CSV
                    </button>
                    <Link href="/dashboard/properties">
                      <button className={`text-xs sm:text-sm font-medium transition-colors duration-300 ${
                        resolvedTheme === "dark" 
                          ? "text-[var(--accent-400)] hover:text-[var(--accent-300)]" 
                          : "text-[var(--accent-700)] hover:text-[var(--accent-600)]"
                      }`}>
                        View All →
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
              {analytics.topProperties.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <p className={`text-sm sm:text-base transition-colors duration-300 ${
                    resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                  }`}>No properties found</p>
                  <Link href="/dashboard/properties/new">
                    <button className={`mt-3 sm:mt-4 text-sm sm:text-base font-medium transition-colors duration-300 ${
                      resolvedTheme === "dark" 
                        ? "text-[var(--accent-400)] hover:text-[var(--accent-300)]" 
                        : "text-[var(--accent-700)] hover:text-[var(--accent-600)]"
                    }`}>
                      Add your first property →
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px] sm:min-w-0">
                    <thead className={`border-b transition-colors duration-300 ${
                      resolvedTheme === "dark" 
                        ? "bg-gray-700/50 border-gray-700" 
                        : "bg-gray-50 border-gray-100"
                    }`}>
                      <tr>
                        <th className={`text-left p-3 sm:p-4 text-xs sm:text-sm font-medium transition-colors duration-300 ${
                          resolvedTheme === "dark" ? "text-gray-400" : "text-gray-600"
                        }`}>Property</th>
                        <th className={`text-left p-3 sm:p-4 text-xs sm:text-sm font-medium transition-colors duration-300 ${
                          resolvedTheme === "dark" ? "text-gray-400" : "text-gray-600"
                        }`}>Views</th>
                        <th className={`text-left p-3 sm:p-4 text-xs sm:text-sm font-medium transition-colors duration-300 ${
                          resolvedTheme === "dark" ? "text-gray-400" : "text-gray-600"
                        }`}>Likes</th>
                        <th className={`text-left p-3 sm:p-4 text-xs sm:text-sm font-medium transition-colors duration-300 ${
                          resolvedTheme === "dark" ? "text-gray-400" : "text-gray-600"
                        }`}>Requests</th>
                        <th className={`text-left p-3 sm:p-4 text-xs sm:text-sm font-medium transition-colors duration-300 ${
                          resolvedTheme === "dark" ? "text-gray-400" : "text-gray-600"
                        }`}>Engagement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.topProperties.map((property, i) => (
                        <tr key={property.id} className={`border-b transition-colors duration-300 hover:bg-gray-50/50 dark:hover:bg-gray-700/50 ${
                          resolvedTheme === "dark" ? "border-gray-700" : "border-gray-50"
                        }`}>
                          <td className="p-3 sm:p-4">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <span className={`text-xs sm:text-sm font-medium transition-colors duration-300 ${
                                resolvedTheme === "dark" ? "text-gray-500" : "text-gray-400"
                              }`}>#{i + 1}</span>
                              <Link href={`/dashboard/properties/${property.id}`}>
                                <span className={`text-xs sm:text-sm font-medium transition-colors duration-300 hover:text-[var(--accent-700)] dark:hover:text-[var(--accent-400)] ${
                                  resolvedTheme === "dark" ? "text-gray-200" : "text-gray-900"
                                }`}>
                                  {property.name.length > 15 ? property.name.slice(0, 15) + '...' : property.name}
                                </span>
                              </Link>
                            </div>
                          </td>
                          <td className={`p-3 sm:p-4 text-xs sm:text-sm transition-colors duration-300 ${
                            resolvedTheme === "dark" ? "text-gray-300" : "text-gray-700"
                          }`}>{property.views.toLocaleString()}</td>
                          <td className={`p-3 sm:p-4 text-xs sm:text-sm transition-colors duration-300 ${
                            resolvedTheme === "dark" ? "text-gray-300" : "text-gray-700"
                          }`}>{property.likes.toLocaleString()}</td>
                          <td className={`p-3 sm:p-4 text-xs sm:text-sm transition-colors duration-300 ${
                            resolvedTheme === "dark" ? "text-gray-300" : "text-gray-700"
                          }`}>{property.requests.toLocaleString()}</td>
                          <td className="p-3 sm:p-4">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <div className={`w-12 sm:w-24 rounded-full h-1.5 sm:h-2 overflow-hidden ${
                                resolvedTheme === "dark" ? "bg-gray-700" : "bg-gray-100"
                              }`}>
                                <div
                                  className={`h-1.5 sm:h-2 rounded-full ${
                                    resolvedTheme === "dark" 
                                      ? "bg-gradient-to-r from-[var(--accent-700)] to-[var(--accent-600)]" 
                                      : "bg-gradient-to-r from-[var(--accent-700)] to-[var(--accent-600)]"
                                  }`}
                                  style={{ width: `${(property.views / analytics.topProperties[0].views) * 100}%` }}
                                />
                              </div>
                              <span className={`text-[10px] sm:text-sm transition-colors duration-300 ${
                                resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                              }`}>
                                {Math.round((property.views / analytics.topProperties[0].views) * 100)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className={`rounded-2xl shadow-sm border transition-colors duration-300 ${
              resolvedTheme === "dark" 
                ? "bg-gray-800/80 border-gray-700" 
                : "bg-white/80 border-gray-100 backdrop-blur-sm"
            }`}>
              <div className={`p-4 sm:p-6 border-b transition-colors duration-300 ${
                resolvedTheme === "dark" ? "border-gray-700" : "border-gray-100"
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`text-sm sm:text-base font-semibold transition-colors duration-300 ${
                      resolvedTheme === "dark" ? "text-gray-100" : "text-gray-900"
                    }`}>Recent Activity</h3>
                    <p className={`text-xs sm:text-sm transition-colors duration-300 ${
                      resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}>Real-time updates from your properties</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const data = analytics.recentActivity.map(a => ({
                          Type: a.type,
                          Property: a.propertyName,
                          Count: a.count || 0,
                          Time: a.timestamp,
                        }));
                        handleExportCSV(data, 'Recent_Activity');
                      }}
                      className={`text-[10px] sm:text-xs font-medium flex items-center gap-0.5 transition-colors duration-300 ${
                        resolvedTheme === "dark" 
                          ? "text-[var(--accent-400)] hover:text-[var(--accent-300)]" 
                          : "text-[var(--accent-700)] hover:text-[var(--accent-600)]"
                      }`}
                    >
                      <FileText className="w-3 h-3" />
                      Export CSV
                    </button>
                    <Activity className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors duration-300 ${
                      resolvedTheme === "dark" ? "text-gray-500" : "text-gray-400"
                    }`} />
                  </div>
                </div>
              </div>
              
              {analytics.recentActivity.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 ${
                    resolvedTheme === "dark" ? "bg-gray-700" : "bg-gray-100"
                  }`}>
                    <Activity className={`w-6 h-6 sm:w-8 sm:h-8 ${
                      resolvedTheme === "dark" ? "text-gray-500" : "text-gray-400"
                    }`} />
                  </div>
                  <h3 className={`text-base sm:text-lg font-semibold mb-1 sm:mb-2 transition-colors duration-300 ${
                    resolvedTheme === "dark" ? "text-gray-200" : "text-gray-800"
                  }`}>No activity yet</h3>
                  <p className={`text-sm sm:text-base transition-colors duration-300 ${
                    resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                  }`}>Activity from your properties will appear here</p>
                </div>
              ) : (
                <div className="p-4 sm:p-6 space-y-6">
                  {(() => {
                    const groupedActivities = {
                      view: analytics.recentActivity.filter(a => a.type === "view"),
                      like: analytics.recentActivity.filter(a => a.type === "like"),
                      request: analytics.recentActivity.filter(a => a.type === "request"),
                    };
                    
                    const sections = [
                      { key: 'view', label: 'Latest Views', icon: Eye, color: 'blue' },
                      { key: 'like', label: 'Latest Likes', icon: Heart, color: 'red' },
                      { key: 'request', label: 'Latest Requests', icon: MessageSquare, color: 'purple' },
                    ];
                    
                    const activeSections = sections.filter(s => groupedActivities[s.key as keyof typeof groupedActivities].length > 0);
                    
                    return activeSections.map((section) => {
                      const activities = groupedActivities[section.key as keyof typeof groupedActivities];
                      const IconComponent = section.icon;
                      const colorClasses = {
                        blue: { bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-200 dark:border-blue-800", text: "text-blue-600 dark:text-blue-400" },
                        red: { bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-200 dark:border-red-800", text: "text-red-600 dark:text-red-400" },
                        purple: { bg: "bg-purple-50 dark:bg-purple-900/20", border: "border-purple-200 dark:border-purple-800", text: "text-purple-600 dark:text-purple-400" },
                      };
                      const colors = colorClasses[section.color as keyof typeof colorClasses];
                      
                      return (
                        <div key={section.key} className={`rounded-xl border p-3 sm:p-4 transition-colors duration-300 ${colors.bg} ${colors.border}`}>
                          <div className="flex items-center gap-2 mb-2 sm:mb-3">
                            <IconComponent className={`w-4 h-4 sm:w-5 sm:h-5 ${colors.text}`} />
                            <h4 className={`text-xs sm:text-sm font-semibold transition-colors duration-300 ${
                              resolvedTheme === "dark" ? "text-gray-200" : "text-gray-700"
                            }`}>
                              {section.label}
                            </h4>
                            <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full ${
                              resolvedTheme === "dark" ? "bg-gray-700 text-gray-400" : "bg-gray-200 text-gray-600"
                            }`}>
                              {activities.length}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {activities.slice(0, isMobile ? 3 : 5).map((activity) => {
                              const now = new Date();
                              const activityDate = new Date(activity.timestampDate);
                              const diffMs = now.getTime() - activityDate.getTime();
                              const diffMins = Math.floor(diffMs / 60000);
                              const diffHours = Math.floor(diffMs / 3600000);
                              const diffDays = Math.floor(diffMs / 86400000);
                              
                              let timeDisplay = '';
                              if (diffMins < 1) {
                                timeDisplay = 'Just now';
                              } else if (diffMins < 60) {
                                timeDisplay = `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
                              } else if (diffHours < 24) {
                                const remainingMins = diffMins % 60;
                                if (remainingMins === 0) {
                                  timeDisplay = `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
                                } else {
                                  timeDisplay = `${diffHours} hour${diffHours === 1 ? '' : 's'} ${remainingMins} minute${remainingMins === 1 ? '' : 's'} ago`;
                                }
                              } else if (diffDays < 7) {
                                const remainingHours = diffHours % 24;
                                if (remainingHours === 0) {
                                  timeDisplay = `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
                                } else {
                                  timeDisplay = `${diffDays} day${diffDays === 1 ? '' : 's'} ${remainingHours} hour${remainingHours === 1 ? '' : 's'} ago`;
                                }
                              } else {
                                timeDisplay = activityDate.toLocaleDateString(undefined, { 
                                  month: 'short', 
                                  day: 'numeric',
                                  year: 'numeric'
                                });
                              }
                              
                              return (
                                <div key={activity.id} className="flex items-center justify-between gap-2">
                                  <Link href={`/dashboard/properties/${activity.propertyId}`} className="flex-1 min-w-0">
                                    <span className={`text-xs sm:text-sm transition-colors duration-300 hover:text-[var(--accent-700)] dark:hover:text-[var(--accent-400)] ${
                                      resolvedTheme === "dark" ? "text-gray-300" : "text-gray-700"
                                    }`}>
                                      {activity.count || 1} {activity.type === "view" ? "view" : activity.type === "like" ? "like" : "request"}
                                      {(activity.count || 1) > 1 ? 's' : ''} on {activity.propertyName}
                                    </span>
                                  </Link>
                                  <span className={`text-[12px] sm:text-[15px] flex-shrink-0 transition-colors duration-300 flex items-center gap-1 ${
                                    resolvedTheme === "dark" ? "text-orange-400" : "text-orange-500"
                                  }`}>
                                    • <span className="font-medium">latest:</span>
                                    <span className={`${resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                                      {timeDisplay}
                                    </span>
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>

            {/* Footer */}
            <footer className="mt-6 sm:mt-8 text-center">
              <p className={`text-[10px] sm:text-xs transition-colors duration-300 ${
                resolvedTheme === "dark" ? "text-gray-500" : "text-gray-400"
              }`}>
                © 2026 Nookly - Property Management Platform | Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            </footer>
          </main>
        </div>
      </div>

      {/* All Modal Components */}
      {/* See More Modal - Engagement Overview */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div 
            className={`rounded-2xl p-4 sm:p-5 w-[340px] max-w-full max-h-[80vh] flex flex-col transition-colors duration-300 shadow-2xl ${
              resolvedTheme === "dark" ? "bg-gray-800" : "bg-white"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <h3 className={`text-sm font-semibold transition-colors duration-300 truncate pr-2 ${
                resolvedTheme === "dark" ? "text-gray-200" : "text-gray-800"
              }`}>
                {modalTitle}
              </h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleExportCSV(modalData, modalTitle.replace(/\s/g, '_'))}
                  className={`p-1 rounded-lg transition-colors duration-300 ${
                    resolvedTheme === "dark" 
                      ? "hover:bg-gray-700 text-[var(--accent-400)]" 
                      : "hover:bg-gray-100 text-[var(--accent-700)]"
                  }`}
                  title="Export CSV"
                >
                  <FileText className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className={`p-1 rounded-lg transition-colors duration-300 flex-shrink-0 ${
                    resolvedTheme === "dark" 
                      ? "hover:bg-gray-700 text-gray-400" 
                      : "hover:bg-gray-100 text-gray-600"
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
              {modalData.map((item, index) => {
                const maxVal = Math.max(...modalData.map(d => d.count), 1);
                const percentage = Math.max((item.count / maxVal) * 100, 5);
                const barColor = index % 3 === 0 ? 'bg-blue-400' : index % 3 === 1 ? 'bg-purple-400' : 'bg-cyan-400';
                return (
                  <div key={index}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className={`transition-colors duration-300 ${
                        resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}>{item.date}</span>
                      <span className={`font-medium transition-colors duration-300 ${
                        resolvedTheme === "dark" ? "text-gray-300" : "text-gray-700"
                      }`}>{item.count.toLocaleString()} views</span>
                    </div>
                    <div className={`w-full rounded-full h-2.5 overflow-hidden ${
                      resolvedTheme === "dark" ? "bg-gray-700" : "bg-gray-100"
                    }`}>
                      <div
                        className={`h-2.5 rounded-full transition-all duration-700 ${barColor}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={`mt-3 pt-2 border-t flex-shrink-0 ${
              resolvedTheme === "dark" ? "border-gray-700" : "border-gray-200"
            }`}>
              <button
                onClick={() => setShowModal(false)}
                className="w-full py-2 text-xs font-medium bg-[var(--accent-700)] hover:bg-[var(--accent-600)] text-white rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Views Per Property Modal */}
      {showViewsModal && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setShowViewsModal(false)}
        >
          <div 
            className={`rounded-2xl p-4 sm:p-5 w-[340px] max-w-full max-h-[80vh] flex flex-col transition-colors duration-300 shadow-2xl ${
              resolvedTheme === "dark" ? "bg-gray-800" : "bg-white"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <h3 className={`text-sm font-semibold transition-colors duration-300 truncate pr-2 ${
                resolvedTheme === "dark" ? "text-gray-200" : "text-gray-800"
              }`}>Views Per Property</h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleExportCSV(viewsModalData, 'Views_Per_Property')}
                  className={`p-1 rounded-lg transition-colors duration-300 ${
                    resolvedTheme === "dark" 
                      ? "hover:bg-gray-700 text-[var(--accent-400)]" 
                      : "hover:bg-gray-100 text-[var(--accent-700)]"
                  }`}
                  title="Export CSV"
                >
                  <FileText className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowViewsModal(false)}
                  className={`p-1 rounded-lg transition-colors duration-300 flex-shrink-0 ${
                    resolvedTheme === "dark" 
                      ? "hover:bg-gray-700 text-gray-400" 
                      : "hover:bg-gray-100 text-gray-600"
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
              {viewsModalData.length === 0 ? (
                <div className="text-center py-8">
                  <p className={`text-sm transition-colors duration-300 ${
                    resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                  }`}>No views data available</p>
                </div>
              ) : (
                viewsModalData.map((item, index) => {
                  const maxVal = Math.max(...viewsModalData.map(d => d.views), 1);
                  const percentage = Math.max((item.views / maxVal) * 100, 5);
                  const barColor = index % 3 === 0 ? 'bg-blue-400' : index % 3 === 1 ? 'bg-purple-400' : 'bg-cyan-400';
                  return (
                    <div key={index}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className={`transition-colors duration-300 truncate pr-2 ${
                          resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                        }`}>{item.name}</span>
                        <span className={`font-medium transition-colors duration-300 flex-shrink-0 ${
                          resolvedTheme === "dark" ? "text-gray-300" : "text-gray-700"
                        }`}>{item.views.toLocaleString()} views</span>
                      </div>
                      <div className={`w-full rounded-full h-2.5 overflow-hidden ${
                        resolvedTheme === "dark" ? "bg-gray-700" : "bg-gray-100"
                      }`}>
                        <div
                          className={`h-2.5 rounded-full transition-all duration-700 ${barColor}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className={`mt-3 pt-2 border-t flex-shrink-0 ${
              resolvedTheme === "dark" ? "border-gray-700" : "border-gray-200"
            }`}>
              <button
                onClick={() => setShowViewsModal(false)}
                className="w-full py-2 text-xs font-medium bg-[var(--accent-700)] hover:bg-[var(--accent-600)] text-white rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Likes Per Property Modal */}
      {showLikesModal && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setShowLikesModal(false)}
        >
          <div 
            className={`rounded-2xl p-4 sm:p-5 w-[340px] max-w-full max-h-[80vh] flex flex-col transition-colors duration-300 shadow-2xl ${
              resolvedTheme === "dark" ? "bg-gray-800" : "bg-white"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <h3 className={`text-sm font-semibold transition-colors duration-300 truncate pr-2 ${
                resolvedTheme === "dark" ? "text-gray-200" : "text-gray-800"
              }`}>Likes Per Property</h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleExportCSV(likesModalData, 'Likes_Per_Property')}
                  className={`p-1 rounded-lg transition-colors duration-300 ${
                    resolvedTheme === "dark" 
                      ? "hover:bg-gray-700 text-[var(--accent-400)]" 
                      : "hover:bg-gray-100 text-[var(--accent-700)]"
                  }`}
                  title="Export CSV"
                >
                  <FileText className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowLikesModal(false)}
                  className={`p-1 rounded-lg transition-colors duration-300 flex-shrink-0 ${
                    resolvedTheme === "dark" 
                      ? "hover:bg-gray-700 text-gray-400" 
                      : "hover:bg-gray-100 text-gray-600"
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
              {likesModalData.length === 0 ? (
                <div className="text-center py-8">
                  <p className={`text-sm transition-colors duration-300 ${
                    resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                  }`}>No likes data available</p>
                </div>
              ) : (
                likesModalData.map((item, index) => {
                  const maxVal = Math.max(...likesModalData.map(d => d.likes), 1);
                  const percentage = Math.max((item.likes / maxVal) * 100, 5);
                  const barColor = index % 3 === 0 ? 'bg-red-400' : index % 3 === 1 ? 'bg-pink-400' : 'bg-rose-400';
                  return (
                    <div key={index}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className={`transition-colors duration-300 truncate pr-2 ${
                          resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                        }`}>{item.name}</span>
                        <span className={`font-medium transition-colors duration-300 flex-shrink-0 ${
                          resolvedTheme === "dark" ? "text-gray-300" : "text-gray-700"
                        }`}>{item.likes.toLocaleString()} likes</span>
                      </div>
                      <div className={`w-full rounded-full h-2.5 overflow-hidden ${
                        resolvedTheme === "dark" ? "bg-gray-700" : "bg-gray-100"
                      }`}>
                        <div
                          className={`h-2.5 rounded-full transition-all duration-700 ${barColor}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className={`mt-3 pt-2 border-t flex-shrink-0 ${
              resolvedTheme === "dark" ? "border-gray-700" : "border-gray-200"
            }`}>
              <button
                onClick={() => setShowLikesModal(false)}
                className="w-full py-2 text-xs font-medium bg-[var(--accent-700)] hover:bg-[var(--accent-600)] text-white rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Requests Per Property Modal */}
      {showRequestsModal && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setShowRequestsModal(false)}
        >
          <div 
            className={`rounded-2xl p-4 sm:p-5 w-[340px] max-w-full max-h-[80vh] flex flex-col transition-colors duration-300 shadow-2xl ${
              resolvedTheme === "dark" ? "bg-gray-800" : "bg-white"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <h3 className={`text-sm font-semibold transition-colors duration-300 truncate pr-2 ${
                resolvedTheme === "dark" ? "text-gray-200" : "text-gray-800"
              }`}>Requests Per Property</h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleExportCSV(requestsModalData, 'Requests_Per_Property')}
                  className={`p-1 rounded-lg transition-colors duration-300 ${
                    resolvedTheme === "dark" 
                      ? "hover:bg-gray-700 text-[var(--accent-400)]" 
                      : "hover:bg-gray-100 text-[var(--accent-700)]"
                  }`}
                  title="Export CSV"
                >
                  <FileText className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowRequestsModal(false)}
                  className={`p-1 rounded-lg transition-colors duration-300 flex-shrink-0 ${
                    resolvedTheme === "dark" 
                      ? "hover:bg-gray-700 text-gray-400" 
                      : "hover:bg-gray-100 text-gray-600"
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
              {requestsModalData.length === 0 ? (
                <div className="text-center py-8">
                  <p className={`text-sm transition-colors duration-300 ${
                    resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                  }`}>No requests data available</p>
                </div>
              ) : (
                requestsModalData.map((item, index) => {
                  const maxVal = Math.max(...requestsModalData.map(d => d.requests), 1);
                  const percentage = Math.max((item.requests / maxVal) * 100, 5);
                  const barColor = index % 3 === 0 ? 'bg-purple-400' : index % 3 === 1 ? 'bg-violet-400' : 'bg-indigo-400';
                  return (
                    <div key={index}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className={`transition-colors duration-300 truncate pr-2 ${
                          resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                        }`}>{item.name}</span>
                        <span className={`font-medium transition-colors duration-300 flex-shrink-0 ${
                          resolvedTheme === "dark" ? "text-gray-300" : "text-gray-700"
                        }`}>{item.requests.toLocaleString()} requests</span>
                      </div>
                      <div className={`w-full rounded-full h-2.5 overflow-hidden ${
                        resolvedTheme === "dark" ? "bg-gray-700" : "bg-gray-100"
                      }`}>
                        <div
                          className={`h-2.5 rounded-full transition-all duration-700 ${barColor}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className={`mt-3 pt-2 border-t flex-shrink-0 ${
              resolvedTheme === "dark" ? "border-gray-700" : "border-gray-200"
            }`}>
              <button
                onClick={() => setShowRequestsModal(false)}
                className="w-full py-2 text-xs font-medium bg-[var(--accent-700)] hover:bg-[var(--accent-600)] text-white rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Per Property Modal */}
      {showRevenueModal && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setShowRevenueModal(false)}
        >
          <div 
            className={`rounded-2xl p-4 sm:p-5 w-[340px] max-w-full max-h-[80vh] flex flex-col transition-colors duration-300 shadow-2xl ${
              resolvedTheme === "dark" ? "bg-gray-800" : "bg-white"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <h3 className={`text-sm font-semibold transition-colors duration-300 truncate pr-2 ${
                resolvedTheme === "dark" ? "text-gray-200" : "text-gray-800"
              }`}>Revenue Per Property</h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleExportCSV(revenueModalData, 'Revenue_Per_Property')}
                  className={`p-1 rounded-lg transition-colors duration-300 ${
                    resolvedTheme === "dark" 
                      ? "hover:bg-gray-700 text-[var(--accent-400)]" 
                      : "hover:bg-gray-100 text-[var(--accent-700)]"
                  }`}
                  title="Export CSV"
                >
                  <FileText className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowRevenueModal(false)}
                  className={`p-1 rounded-lg transition-colors duration-300 flex-shrink-0 ${
                    resolvedTheme === "dark" 
                      ? "hover:bg-gray-700 text-gray-400" 
                      : "hover:bg-gray-100 text-gray-600"
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
              {revenueModalData.length === 0 ? (
                <div className="text-center py-8">
                  <p className={`text-sm transition-colors duration-300 ${
                    resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                  }`}>No revenue data available</p>
                </div>
              ) : (
                revenueModalData.map((item, index) => {
                  const maxVal = Math.max(...revenueModalData.map(d => d.revenue), 1);
                  const percentage = Math.max((item.revenue / maxVal) * 100, 5);
                  const barColor = item.status === 'Rented' ? 'bg-green-500' : 'bg-gray-400';
                  return (
                    <div key={index}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <div className="flex items-center gap-2 truncate pr-2">
                          <span className={`transition-colors duration-300 ${
                            resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                          }`}>{item.name}</span>
                          <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${
                            item.status === 'Rented' 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                          }`}>{item.status}</span>
                        </div>
                        <span className={`font-medium transition-colors duration-300 flex-shrink-0 ${
                          resolvedTheme === "dark" ? "text-gray-300" : "text-gray-700"
                        }`}>${item.revenue.toLocaleString()}</span>
                      </div>
                      <div className={`w-full rounded-full h-2.5 overflow-hidden ${
                        resolvedTheme === "dark" ? "bg-gray-700" : "bg-gray-100"
                      }`}>
                        <div
                          className={`h-2.5 rounded-full transition-all duration-700 ${barColor}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className={`mt-3 pt-2 border-t flex-shrink-0 ${
              resolvedTheme === "dark" ? "border-gray-700" : "border-gray-200"
            }`}>
              <button
                onClick={() => setShowRevenueModal(false)}
                className="w-full py-2 text-xs font-medium bg-[var(--accent-700)] hover:bg-[var(--accent-600)] text-white rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Daily Modal */}
      {showRevenueDailyModal && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setShowRevenueDailyModal(false)}
        >
          <div 
            className={`rounded-2xl p-4 sm:p-5 w-[340px] max-w-full max-h-[80vh] flex flex-col transition-colors duration-300 shadow-2xl ${
              resolvedTheme === "dark" ? "bg-gray-800" : "bg-white"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <h3 className={`text-sm font-semibold transition-colors duration-300 truncate pr-2 ${
                resolvedTheme === "dark" ? "text-gray-200" : "text-gray-800"
              }`}>Daily Revenue</h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleExportCSV(revenueDailyModalData, 'Daily_Revenue')}
                  className={`p-1 rounded-lg transition-colors duration-300 ${
                    resolvedTheme === "dark" 
                      ? "hover:bg-gray-700 text-[var(--accent-400)]" 
                      : "hover:bg-gray-100 text-[var(--accent-700)]"
                  }`}
                  title="Export CSV"
                >
                  <FileText className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowRevenueDailyModal(false)}
                  className={`p-1 rounded-lg transition-colors duration-300 flex-shrink-0 ${
                    resolvedTheme === "dark" 
                      ? "hover:bg-gray-700 text-gray-400" 
                      : "hover:bg-gray-100 text-gray-600"
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
              {revenueDailyModalData.length === 0 ? (
                <div className="text-center py-8">
                  <p className={`text-sm transition-colors duration-300 ${
                    resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                  }`}>No daily revenue data available</p>
                </div>
              ) : (
                revenueDailyModalData.map((item, index) => {
                  const maxVal = Math.max(...revenueDailyModalData.map(d => d.revenue), 1);
                  const percentage = Math.max((item.revenue / maxVal) * 100, 5);
                  const barColor = index % 3 === 0 ? 'bg-green-500' : index % 3 === 1 ? 'bg-emerald-500' : 'bg-teal-500';
                  return (
                    <div key={index}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className={`transition-colors duration-300 ${
                          resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                        }`}>{item.date}</span>
                        <span className={`font-medium transition-colors duration-300 ${
                          resolvedTheme === "dark" ? "text-gray-300" : "text-gray-700"
                        }`}>${item.revenue.toLocaleString()}</span>
                      </div>
                      <div className={`w-full rounded-full h-2.5 overflow-hidden ${
                        resolvedTheme === "dark" ? "bg-gray-700" : "bg-gray-100"
                      }`}>
                        <div
                          className={`h-2.5 rounded-full transition-all duration-700 ${barColor}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className={`mt-3 pt-2 border-t flex-shrink-0 ${
              resolvedTheme === "dark" ? "border-gray-700" : "border-gray-200"
            }`}>
              <button
                onClick={() => setShowRevenueDailyModal(false)}
                className="w-full py-2 text-xs font-medium bg-[var(--accent-700)] hover:bg-[var(--accent-600)] text-white rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Occupancy Per Property Modal */}
      {showOccupancyModal && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setShowOccupancyModal(false)}
        >
          <div 
            className={`rounded-2xl p-4 sm:p-5 w-[340px] max-w-full max-h-[80vh] flex flex-col transition-colors duration-300 shadow-2xl ${
              resolvedTheme === "dark" ? "bg-gray-800" : "bg-white"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <h3 className={`text-sm font-semibold transition-colors duration-300 truncate pr-2 ${
                resolvedTheme === "dark" ? "text-gray-200" : "text-gray-800"
              }`}>Occupancy Per Property</h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleExportCSV(occupancyModalData, 'Occupancy_Per_Property')}
                  className={`p-1 rounded-lg transition-colors duration-300 ${
                    resolvedTheme === "dark" 
                      ? "hover:bg-gray-700 text-[var(--accent-400)]" 
                      : "hover:bg-gray-100 text-[var(--accent-700)]"
                  }`}
                  title="Export CSV"
                >
                  <FileText className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowOccupancyModal(false)}
                  className={`p-1 rounded-lg transition-colors duration-300 flex-shrink-0 ${
                    resolvedTheme === "dark" 
                      ? "hover:bg-gray-700 text-gray-400" 
                      : "hover:bg-gray-100 text-gray-600"
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
              {occupancyModalData.length === 0 ? (
                <div className="text-center py-8">
                  <p className={`text-sm transition-colors duration-300 ${
                    resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                  }`}>No occupancy data available</p>
                </div>
              ) : (
                occupancyModalData.map((item, index) => {
                  const isOccupied = item.status === 'Occupied';
                  return (
                    <div key={index} className={`flex items-center justify-between p-2 rounded-lg border ${
                      resolvedTheme === "dark" ? "border-gray-700" : "border-gray-100"
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isOccupied ? 'bg-green-500' : 'bg-gray-400'}`} />
                        <span className={`text-xs transition-colors duration-300 ${
                          resolvedTheme === "dark" ? "text-gray-300" : "text-gray-700"
                        }`}>{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${
                          isOccupied ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
                        }`}>{item.status}</span>
                        <span className={`text-xs transition-colors duration-300 ${
                          resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                        }`}>${item.price}/mo</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className={`mt-3 pt-2 border-t flex-shrink-0 ${
              resolvedTheme === "dark" ? "border-gray-700" : "border-gray-200"
            }`}>
              <button
                onClick={() => setShowOccupancyModal(false)}
                className="w-full py-2 text-xs font-medium bg-[var(--accent-700)] hover:bg-[var(--accent-600)] text-white rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Property Types Modal */}
      {showPropertyTypesModal && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setShowPropertyTypesModal(false)}
        >
          <div 
            className={`rounded-2xl p-4 sm:p-5 w-[340px] max-w-full max-h-[80vh] flex flex-col transition-colors duration-300 shadow-2xl ${
              resolvedTheme === "dark" ? "bg-gray-800" : "bg-white"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <h3 className={`text-sm font-semibold transition-colors duration-300 truncate pr-2 ${
                resolvedTheme === "dark" ? "text-gray-200" : "text-gray-800"
              }`}>Property Types</h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleExportCSV(propertyTypesModalData, 'Property_Types')}
                  className={`p-1 rounded-lg transition-colors duration-300 ${
                    resolvedTheme === "dark" 
                      ? "hover:bg-gray-700 text-[var(--accent-400)]" 
                      : "hover:bg-gray-100 text-[var(--accent-700)]"
                  }`}
                  title="Export CSV"
                >
                  <FileText className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowPropertyTypesModal(false)}
                  className={`p-1 rounded-lg transition-colors duration-300 flex-shrink-0 ${
                    resolvedTheme === "dark" 
                      ? "hover:bg-gray-700 text-gray-400" 
                      : "hover:bg-gray-100 text-gray-600"
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
              {propertyTypesModalData.length === 0 ? (
                <div className="text-center py-8">
                  <p className={`text-sm transition-colors duration-300 ${
                    resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                  }`}>No property types available</p>
                </div>
              ) : (
                propertyTypesModalData.map((item, index) => {
                  const colors = ['bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-rose-500', 'bg-orange-500', 'bg-amber-500'];
                  const color = colors[index % colors.length];
                  return (
                    <div key={index} className={`rounded-lg p-3 border ${
                      resolvedTheme === "dark" ? "border-gray-700 bg-gray-700/30" : "border-gray-200 bg-gray-50"
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${color}`} />
                          <span className={`text-sm font-semibold transition-colors duration-300 ${
                            resolvedTheme === "dark" ? "text-gray-200" : "text-gray-800"
                          }`}>{item.type}</span>
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          item.occupancyRate > 70 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                          item.occupancyRate > 40 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                          'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        }`}>
                          {item.occupancyRate}% occupied
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className={`transition-colors duration-300 ${
                            resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                          }`}>Properties</span>
                          <p className={`font-semibold transition-colors duration-300 ${
                            resolvedTheme === "dark" ? "text-gray-200" : "text-gray-700"
                          }`}>{item.count}</p>
                        </div>
                        <div>
                          <span className={`transition-colors duration-300 ${
                            resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                          }`}>Avg Price</span>
                          <p className={`font-semibold transition-colors duration-300 ${
                            resolvedTheme === "dark" ? "text-gray-200" : "text-gray-700"
                          }`}>${item.avgPrice.toLocaleString()}</p>
                        </div>
                        <div>
                          <span className={`transition-colors duration-300 ${
                            resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                          }`}>Views</span>
                          <p className={`font-semibold transition-colors duration-300 ${
                            resolvedTheme === "dark" ? "text-gray-200" : "text-gray-700"
                          }`}>{item.views.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className={`mt-3 pt-2 border-t flex-shrink-0 ${
              resolvedTheme === "dark" ? "border-gray-700" : "border-gray-200"
            }`}>
              <button
                onClick={() => setShowPropertyTypesModal(false)}
                className="w-full py-2 text-xs font-medium bg-[var(--accent-700)] hover:bg-[var(--accent-600)] text-white rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Response Time Modal */}
      {showResponseTimeModal && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setShowResponseTimeModal(false)}
        >
          <div 
            className={`rounded-2xl p-4 sm:p-5 w-[340px] max-w-full max-h-[80vh] flex flex-col transition-colors duration-300 shadow-2xl ${
              resolvedTheme === "dark" ? "bg-gray-800" : "bg-white"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <h3 className={`text-sm font-semibold transition-colors duration-300 truncate pr-2 ${
                resolvedTheme === "dark" ? "text-gray-200" : "text-gray-800"
              }`}>Response Time Per Property</h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleExportCSV(responseTimeModalData, 'Response_Time')}
                  className={`p-1 rounded-lg transition-colors duration-300 ${
                    resolvedTheme === "dark" 
                      ? "hover:bg-gray-700 text-[var(--accent-400)]" 
                      : "hover:bg-gray-100 text-[var(--accent-700)]"
                  }`}
                  title="Export CSV"
                >
                  <FileText className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowResponseTimeModal(false)}
                  className={`p-1 rounded-lg transition-colors duration-300 flex-shrink-0 ${
                    resolvedTheme === "dark" 
                      ? "hover:bg-gray-700 text-gray-400" 
                      : "hover:bg-gray-100 text-gray-600"
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
              {responseTimeModalData.length === 0 ? (
                <div className="text-center py-8">
                  <p className={`text-sm transition-colors duration-300 ${
                    resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                  }`}>No response time data available</p>
                </div>
              ) : (
                responseTimeModalData.map((item, index) => {
                  const maxVal = Math.max(...responseTimeModalData.map(d => d.avgHours), 1);
                  const percentage = Math.max(((maxVal - item.avgHours) / maxVal) * 100, 5);
                  const isFast = item.avgHours < 24;
                  const isMedium = item.avgHours >= 24 && item.avgHours < 72;
                  const barColor = isFast ? 'bg-green-500' : isMedium ? 'bg-yellow-500' : 'bg-red-500';
                  return (
                    <div key={index}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className={`transition-colors duration-300 ${
                          resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                        }`}>{item.name}</span>
                        <span className={`font-medium transition-colors duration-300 ${
                          isFast ? 'text-green-600 dark:text-green-400' : 
                          isMedium ? 'text-yellow-600 dark:text-yellow-400' : 
                          'text-red-600 dark:text-red-400'
                        }`}>{item.avgHours}h</span>
                      </div>
                      <div className={`w-full rounded-full h-2.5 overflow-hidden ${
                        resolvedTheme === "dark" ? "bg-gray-700" : "bg-gray-100"
                      }`}>
                        <div
                          className={`h-2.5 rounded-full transition-all duration-700 ${barColor}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className={`mt-3 pt-2 border-t flex-shrink-0 ${
              resolvedTheme === "dark" ? "border-gray-700" : "border-gray-200"
            }`}>
              <button
                onClick={() => setShowResponseTimeModal(false)}
                className="w-full py-2 text-xs font-medium bg-[var(--accent-700)] hover:bg-[var(--accent-600)] text-white rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Locations Modal */}
      {showLocationsModal && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setShowLocationsModal(false)}
        >
          <div 
            className={`rounded-2xl p-4 sm:p-5 w-[340px] max-w-full max-h-[80vh] flex flex-col transition-colors duration-300 shadow-2xl ${
              resolvedTheme === "dark" ? "bg-gray-800" : "bg-white"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <h3 className={`text-sm font-semibold transition-colors duration-300 truncate pr-2 ${
                resolvedTheme === "dark" ? "text-gray-200" : "text-gray-800"
              }`}>Property Locations</h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleExportCSV(locationsModalData, 'Property_Locations')}
                  className={`p-1 rounded-lg transition-colors duration-300 ${
                    resolvedTheme === "dark" 
                      ? "hover:bg-gray-700 text-[var(--accent-400)]" 
                      : "hover:bg-gray-100 text-[var(--accent-700)]"
                  }`}
                  title="Export CSV"
                >
                  <FileText className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowLocationsModal(false)}
                  className={`p-1 rounded-lg transition-colors duration-300 flex-shrink-0 ${
                    resolvedTheme === "dark" 
                      ? "hover:bg-gray-700 text-gray-400" 
                      : "hover:bg-gray-100 text-gray-600"
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
              {locationsModalData.length === 0 ? (
                <div className="text-center py-8">
                  <p className={`text-sm transition-colors duration-300 ${
                    resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                  }`}>No location data available</p>
                </div>
              ) : (
                locationsModalData.map((item, index) => {
                  const maxCount = Math.max(...locationsModalData.map(d => d.count), 1);
                  const percentage = Math.max((item.count / maxCount) * 100, 5);
                  return (
                    <div key={index}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          <span className={`transition-colors duration-300 ${
                            resolvedTheme === "dark" ? "text-gray-300" : "text-gray-700"
                          }`}>{item.city}</span>
                        </div>
                        <span className={`font-medium transition-colors duration-300 ${
                          resolvedTheme === "dark" ? "text-gray-300" : "text-gray-700"
                        }`}>{item.count} properties</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                        <span>${item.avgPrice}/mo avg</span>
                        <span>{item.occupancyRate}% occupied</span>
                        <span>{item.totalViews} views</span>
                      </div>
                      <div className={`w-full rounded-full h-1.5 overflow-hidden mt-1 ${
                        resolvedTheme === "dark" ? "bg-gray-700" : "bg-gray-100"
                      }`}>
                        <div
                          className="h-1.5 rounded-full transition-all duration-700 bg-indigo-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className={`mt-3 pt-2 border-t flex-shrink-0 ${
              resolvedTheme === "dark" ? "border-gray-700" : "border-gray-200"
            }`}>
              <button
                onClick={() => setShowLocationsModal(false)}
                className="w-full py-2 text-xs font-medium bg-[var(--accent-700)] hover:bg-[var(--accent-600)] text-white rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Seasonal Trends Modal */}
      {showSeasonalModal && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setShowSeasonalModal(false)}
        >
          <div 
            className={`rounded-2xl p-4 sm:p-5 w-[340px] max-w-full max-h-[80vh] flex flex-col transition-colors duration-300 shadow-2xl ${
              resolvedTheme === "dark" ? "bg-gray-800" : "bg-white"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <h3 className={`text-sm font-semibold transition-colors duration-300 truncate pr-2 ${
                resolvedTheme === "dark" ? "text-gray-200" : "text-gray-800"
              }`}>Seasonal Trends</h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleExportCSV(seasonalModalData, 'Seasonal_Trends')}
                  className={`p-1 rounded-lg transition-colors duration-300 ${
                    resolvedTheme === "dark" 
                      ? "hover:bg-gray-700 text-[var(--accent-400)]" 
                      : "hover:bg-gray-100 text-[var(--accent-700)]"
                  }`}
                  title="Export CSV"
                >
                  <FileText className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowSeasonalModal(false)}
                  className={`p-1 rounded-lg transition-colors duration-300 flex-shrink-0 ${
                    resolvedTheme === "dark" 
                      ? "hover:bg-gray-700 text-gray-400" 
                      : "hover:bg-gray-100 text-gray-600"
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
              {seasonalModalData.length === 0 ? (
                <div className="text-center py-8">
                  <p className={`text-sm transition-colors duration-300 ${
                    resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                  }`}>No seasonal data available</p>
                </div>
              ) : (
                seasonalModalData.map((item, index) => {
                  const maxViews = Math.max(...seasonalModalData.map(d => d.views), 1);
                  const percentage = Math.max((item.views / maxViews) * 100, 5);
                  const isPeak = item.views > maxViews * 0.7;
                  return (
                    <div key={index}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className={`font-semibold transition-colors duration-300 ${
                          isPeak ? 'text-green-600 dark:text-green-400' : 
                          resolvedTheme === "dark" ? 'text-gray-300' : 'text-gray-700'
                        }`}>{item.month}</span>
                        <div className="flex items-center gap-2">
                          <span className={`transition-colors duration-300 ${
                            resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                          }`}>{item.views} views</span>
                          <span className={`transition-colors duration-300 ${
                            resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                          }`}>• ${item.revenue}</span>
                        </div>
                      </div>
                      <div className={`w-full rounded-full h-2 overflow-hidden ${
                        resolvedTheme === "dark" ? "bg-gray-700" : "bg-gray-100"
                      }`}>
                        <div
                          className={`h-2 rounded-full transition-all duration-700 ${
                            isPeak ? 'bg-green-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      {item.requests > 0 && (
                        <div className="flex justify-end text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                          {item.requests} requests
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className={`mt-3 pt-2 border-t flex-shrink-0 ${
              resolvedTheme === "dark" ? "border-gray-700" : "border-gray-200"
            }`}>
              <button
                onClick={() => setShowSeasonalModal(false)}
                className="w-full py-2 text-xs font-medium bg-[var(--accent-700)] hover:bg-[var(--accent-600)] text-white rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Maintenance Modal */}
      {showMaintenanceModal && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setShowMaintenanceModal(false)}
        >
          <div 
            className={`rounded-2xl p-4 sm:p-5 w-[340px] max-w-full max-h-[80vh] flex flex-col transition-colors duration-300 shadow-2xl ${
              resolvedTheme === "dark" ? "bg-gray-800" : "bg-white"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <h3 className={`text-sm font-semibold transition-colors duration-300 truncate pr-2 ${
                resolvedTheme === "dark" ? "text-gray-200" : "text-gray-800"
              }`}>Maintenance Issues</h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleExportCSV(maintenanceModalData, 'Maintenance_Issues')}
                  className={`p-1 rounded-lg transition-colors duration-300 ${
                    resolvedTheme === "dark" 
                      ? "hover:bg-gray-700 text-[var(--accent-400)]" 
                      : "hover:bg-gray-100 text-[var(--accent-700)]"
                  }`}
                  title="Export CSV"
                >
                  <FileText className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowMaintenanceModal(false)}
                  className={`p-1 rounded-lg transition-colors duration-300 flex-shrink-0 ${
                    resolvedTheme === "dark" 
                      ? "hover:bg-gray-700 text-gray-400" 
                      : "hover:bg-gray-100 text-gray-600"
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
              {maintenanceModalData.length === 0 ? (
                <div className="text-center py-8">
                  <p className={`text-sm transition-colors duration-300 ${
                    resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                  }`}>No maintenance issues</p>
                </div>
              ) : (
                maintenanceModalData.map((item, index) => {
                  const maxCount = Math.max(...maintenanceModalData.map(d => d.count), 1);
                  const percentage = Math.max((item.count / maxCount) * 100, 5);
                  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-purple-500'];
                  const color = colors[index % colors.length];
                  return (
                    <div key={index}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className={`transition-colors duration-300 ${
                          resolvedTheme === "dark" ? "text-gray-300" : "text-gray-700"
                        }`}>{item.name}</span>
                        <span className={`font-medium transition-colors duration-300 ${
                          resolvedTheme === "dark" ? "text-gray-300" : "text-gray-700"
                        }`}>{item.count} issues</span>
                      </div>
                      <div className={`w-full rounded-full h-2 overflow-hidden ${
                        resolvedTheme === "dark" ? "bg-gray-700" : "bg-gray-100"
                      }`}>
                        <div
                          className={`h-2 rounded-full transition-all duration-700 ${color}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className={`mt-3 pt-2 border-t flex-shrink-0 ${
              resolvedTheme === "dark" ? "border-gray-700" : "border-gray-200"
            }`}>
              <button
                onClick={() => setShowMaintenanceModal(false)}
                className="w-full py-2 text-xs font-medium bg-[var(--accent-700)] hover:bg-[var(--accent-600)] text-white rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Property Health Modal */}
      {showPropertyHealthModal && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setShowPropertyHealthModal(false)}
        >
          <div 
            className={`rounded-2xl p-4 sm:p-5 w-[380px] max-w-full max-h-[80vh] flex flex-col transition-colors duration-300 shadow-2xl ${
              resolvedTheme === "dark" ? "bg-gray-800" : "bg-white"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <h3 className={`text-sm font-semibold transition-colors duration-300 truncate pr-2 ${
                resolvedTheme === "dark" ? "text-gray-200" : "text-gray-800"
              }`}>Property Health Scores</h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const data = propertyHealthModalData.map(p => ({
                      Property: p.name,
                      Score: p.score,
                      Status: p.status,
                      Issues: p.issues.join(', '),
                    }));
                    handleExportCSV(data, 'Property_Health');
                  }}
                  className={`p-1 rounded-lg transition-colors duration-300 ${
                    resolvedTheme === "dark" 
                      ? "hover:bg-gray-700 text-[var(--accent-400)]" 
                      : "hover:bg-gray-100 text-[var(--accent-700)]"
                  }`}
                  title="Export CSV"
                >
                  <FileText className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowPropertyHealthModal(false)}
                  className={`p-1 rounded-lg transition-colors duration-300 flex-shrink-0 ${
                    resolvedTheme === "dark" 
                      ? "hover:bg-gray-700 text-gray-400" 
                      : "hover:bg-gray-100 text-gray-600"
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
              {propertyHealthModalData.length === 0 ? (
                <div className="text-center py-8">
                  <p className={`text-sm transition-colors duration-300 ${
                    resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
                  }`}>No health data available</p>
                </div>
              ) : (
                propertyHealthModalData.map((item) => {
                  const statusColors = {
                    healthy: 'bg-green-500',
                    warning: 'bg-yellow-500',
                    critical: 'bg-red-500',
                  };
                  const statusTextColors = {
                    healthy: 'text-green-600 dark:text-green-400',
                    warning: 'text-yellow-600 dark:text-yellow-400',
                    critical: 'text-red-600 dark:text-red-400',
                  };
                  const statusIcons = {
                    healthy: CheckCircle,
                    warning: AlertTriangle,
                    critical: XCircle,
                  };
                  const StatusIcon = statusIcons[item.status];
                  
                  return (
                    <div key={item.id} className={`rounded-lg p-3 border ${
                      resolvedTheme === "dark" ? "border-gray-700 bg-gray-700/30" : "border-gray-200 bg-gray-50"
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <StatusIcon className={`w-4 h-4 ${statusTextColors[item.status]}`} />
                          <Link href={`/dashboard/properties/${item.id}`}>
                            <span className={`text-sm font-semibold transition-colors duration-300 hover:text-[var(--accent-700)] ${
                              resolvedTheme === "dark" ? "text-gray-200" : "text-gray-800"
                            }`}>{item.name}</span>
                          </Link>
                        </div>
                        <span className={`text-sm font-bold ${statusTextColors[item.status]}`}>
                          {item.score}/100
                        </span>
                      </div>
                      <div className={`w-full rounded-full h-2 overflow-hidden ${
                        resolvedTheme === "dark" ? "bg-gray-600" : "bg-gray-200"
                      }`}>
                        <div
                          className={`h-2 rounded-full transition-all duration-700 ${
                            item.score >= 60 ? 'bg-green-500' : item.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${item.score}%` }}
                        />
                      </div>
                      {item.issues.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {item.issues.map((issue, idx) => (
                            <span key={idx} className={`text-[8px] px-1.5 py-0.5 rounded-full ${
                              resolvedTheme === "dark" 
                                ? "bg-red-900/30 text-red-400" 
                                : "bg-red-50 text-red-600"
                            }`}>
                              {issue}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className={`mt-3 pt-2 border-t flex-shrink-0 ${
              resolvedTheme === "dark" ? "border-gray-700" : "border-gray-200"
            }`}>
              <button
                onClick={() => setShowPropertyHealthModal(false)}
                className="w-full py-2 text-xs font-medium bg-[var(--accent-700)] hover:bg-[var(--accent-600)] text-white rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}