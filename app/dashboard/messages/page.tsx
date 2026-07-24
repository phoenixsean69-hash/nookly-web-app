"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { databases } from "@/lib/appwrite/config";
import client from "@/lib/appwrite/config";
import { Query as AppwriteQuery, RealtimeResponseEvent } from "appwrite";
import Image from "next/image";
import {
  MessageCircle,
  Search,
  Info,
  Clock,
  X,
  Home,
  CheckCircle,
  AlertCircle,
  Eye,
  ChevronLeft,
  Image as ImageIcon,
  Check,
  XCircle,
  Bell,
} from "lucide-react";

interface QueryMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: Date;
}

interface PropertyInquiry {
  $id: string;
  propertyId: string;
  propertyName: string;
  propertyImage?: string;
  inquiryType: "information" | "complaint" | "other";
  status: "pending" | "in-progress" | "resolved";
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  tenantAvatar?: string;
  writerAvatar?: string;
  message: string;
  response?: string;
  createdAt: string;
  updatedAt: string;
  messages: QueryMessage[];
  unreadCount: number;
  image1?: string;
  image2?: string;
  image3?: string;
}

// Notification interface
interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
  inquiryId?: string;
}

export default function MessagesPage() {
  const dispatchMessagesUpdate = () => {
  const event = new CustomEvent('messagesUpdated');
  window.dispatchEvent(event);
};
  const { organization, user } = useAuth();
  const { theme } = useTheme();
  const [inquiries, setInquiries] = useState<PropertyInquiry[]>([]);
  const [selectedInquiry, setSelectedInquiry] = useState<PropertyInquiry | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileInquiryList, setShowMobileInquiryList] = useState(true);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showClearDoneModal, setShowClearDoneModal] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isRealtimeEnabled, setIsRealtimeEnabled] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setShowMobileInquiryList(true);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Function to check sidebar state from localStorage
  const checkSidebarState = useCallback(() => {
    if (isMobile) {
      const mobileState = sessionStorage.getItem('mobileSidebarOpen');
      setIsSidebarCollapsed(mobileState !== 'true');
      return;
    }
    const savedState = localStorage.getItem('sidebarCollapsed');
    setIsSidebarCollapsed(savedState === 'true');
  }, [isMobile]);

  // Listen for sidebar collapse state changes
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

  // Transform document to inquiry
  const transformDocumentToInquiry = (doc: any): PropertyInquiry => ({
    $id: doc.$id,
    propertyId: doc.referenceProperty || "",
    propertyName: doc.referenceProperty || "Unknown Property",
    propertyImage: doc.snap || "",
    inquiryType: doc.category || "other",
    status: doc.status || "pending",
    tenantId: doc.writer || "",
    tenantName: doc.writer || "Anonymous",
    tenantEmail: "",
    tenantPhone: "",
    tenantAvatar: doc.writerAvatar || doc.avatar || "",
    writerAvatar: doc.writerAvatar || doc.avatar || "",
    message: doc.body || "",
    response: doc.response || "",
    createdAt: doc.$createdAt,
    updatedAt: doc.$updatedAt,
    messages: [],
    unreadCount: 0,
    image1: doc.image1 || null,
    image2: doc.image2 || null,
    image3: doc.image3 || null,
  });

  // Fetch queries from the queries collection
  useEffect(() => {
    fetchQueries();
  }, []);

  const fetchQueries = async () => {
    try {
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_QUERIES_COLLECTION_ID!,
        [AppwriteQuery.orderDesc("$createdAt")]
      );
      
      const transformedQueries = response.documents.map((doc: any) => transformDocumentToInquiry(doc));
      setInquiries(transformedQueries);
    } catch (error) {
      console.error("Error fetching queries:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // -------- REALTIME IMPLEMENTATION (FIXED) --------
  useEffect(() => {
    if (!isRealtimeEnabled) return;

    console.log("🔌 Setting up Appwrite Realtime subscription...");

    // Subscribe to realtime changes in the queries collection
    const unsubscribe = client.subscribe(
      `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.collections.${process.env.NEXT_PUBLIC_APPWRITE_QUERIES_COLLECTION_ID}.documents`,
      (response: RealtimeResponseEvent<Record<string, any>>) => {
        console.log("🔄 Real-time update received:", response);
        
        // Check if there are events
        if (!response.events || response.events.length === 0) {
          return;
        }

        // Get the first event type
        const eventType = response.events[0];
        const payload = response.payload;

        if (!payload) return;

        // Handle different event types
        if (eventType.includes('documents.create')) {
          // New document created
          const newInquiry = transformDocumentToInquiry(payload);
          
          setInquiries(prev => {
            const exists = prev.some(inq => inq.$id === newInquiry.$id);
            if (exists) return prev;
            
            // Show notification
            addNotification(
              `📝 New query from ${newInquiry.tenantName}`,
              'info',
              newInquiry.$id
            );
            playNotificationSound();
            
            return [newInquiry, ...prev];
          });
        } 
        else if (eventType.includes('documents.update')) {
          // Document updated
          const updatedInquiry = transformDocumentToInquiry(payload);
          
          setInquiries(prev => {
            const oldInquiry = prev.find(inq => inq.$id === updatedInquiry.$id);
            
            // Show notification for status change
            if (oldInquiry && oldInquiry.status !== updatedInquiry.status) {
              const statusMessages: Record<string, string> = {
                'pending': '⏳ pending',
                'in-progress': '🔄 in progress',
                'resolved': '✅ resolved'
              };
              addNotification(
                `📌 Query from ${updatedInquiry.tenantName} is now ${statusMessages[updatedInquiry.status] || updatedInquiry.status}`,
                updatedInquiry.status === 'resolved' ? 'success' : 'info',
                updatedInquiry.$id
              );
              playNotificationSound();
            }
            
            // Show notification for response added
            if (oldInquiry && !oldInquiry.response && updatedInquiry.response) {
              addNotification(
                `💬 Response added to query from ${updatedInquiry.tenantName}`,
                'success',
                updatedInquiry.$id
              );
              playNotificationSound();
            }
            
            // Update the inquiry in the list
            return prev.map(inq => 
              inq.$id === updatedInquiry.$id ? updatedInquiry : inq
            );
          });
          
          // Update selected inquiry if it was the one updated
          if (selectedInquiry?.$id === updatedInquiry.$id) {
            setSelectedInquiry(updatedInquiry);
          }
        }
        else if (eventType.includes('documents.delete')) {
          // Document deleted
          const deletedId = payload.$id;
          
          setInquiries(prev => {
            const deletedInquiry = prev.find(inq => inq.$id === deletedId);
            if (deletedInquiry) {
              addNotification(
                `🗑️ Query from ${deletedInquiry.tenantName} was removed`,
                'warning',
                deletedId
              );
            }
            return prev.filter(inq => inq.$id !== deletedId);
          });
          
          if (selectedInquiry?.$id === deletedId) {
            setSelectedInquiry(null);
          }
        }
      }
    );

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) {
        console.log("🔌 Unsubscribing from realtime updates...");
        unsubscribe();
      }
    };
  }, [isRealtimeEnabled]);

  // -------- NOTIFICATION SYSTEM --------
  const addNotification = (message: string, type: 'info' | 'success' | 'warning' | 'error', inquiryId?: string) => {
    const newNotification: Notification = {
      id: Date.now().toString(),
      message,
      type,
      timestamp: Date.now(),
      inquiryId,
    };
    
    setNotifications(prev => {
      // Don't add duplicate notifications (same message within 5 seconds)
      const isDuplicate = prev.some(n => 
        n.message === message && 
        Date.now() - n.timestamp < 5000
      );
      if (isDuplicate) return prev;
      
      // Keep only last 50 notifications
      const updated = [newNotification, ...prev].slice(0, 50);
      return updated;
    });
    
    // Increment unread count
    setUnreadNotifications(prev => prev + 1);
    
    // Auto-dismiss notification after 5 seconds if not showing notification panel
    if (!showNotifications) {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
      notificationTimeoutRef.current = setTimeout(() => {
        setUnreadNotifications(0);
      }, 5000);
    }
  };

  const playNotificationSound = () => {
    try {
      // Create a simple audio notification using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Audio notification not supported');
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadNotifications(0);
    setShowNotifications(false);
  };

  const markAllAsRead = () => {
    setUnreadNotifications(0);
  };

// Update the handleMarkAsRead function:
const handleMarkAsRead = async (inquiryId: string) => {
  try {
    await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_QUERIES_COLLECTION_ID!,
      inquiryId,
      { status: "in-progress" }
    );
    
    // Update local state
    setInquiries(prev => prev.map(inq => 
      inq.$id === inquiryId ? { ...inq, status: "in-progress" as const } : inq
    ));
    
    if (selectedInquiry?.$id === inquiryId) {
      setSelectedInquiry({ ...selectedInquiry, status: "in-progress" as const });
    }
    
    addNotification(`✅ Query marked as read`, 'success', inquiryId);
    
    // Dispatch event to update sidebar
    dispatchMessagesUpdate();
  } catch (error) {
    console.error("Error marking as read:", error);
    addNotification(`❌ Failed to mark as read`, 'error');
  }
};

// Update the handleResolve function:
const handleResolve = async (inquiryId: string) => {
  try {
    await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_QUERIES_COLLECTION_ID!,
      inquiryId,
      { status: "resolved" }
    );
    
    // Update local state
    setInquiries(prev => prev.map(inq => 
      inq.$id === inquiryId ? { ...inq, status: "resolved" as const } : inq
    ));
    
    if (selectedInquiry?.$id === inquiryId) {
      setSelectedInquiry({ ...selectedInquiry, status: "resolved" as const });
    }
    
    addNotification(`✅ Query resolved successfully`, 'success', inquiryId);
    
    // Dispatch event to update sidebar
    dispatchMessagesUpdate();
  } catch (error) {
    console.error("Error resolving inquiry:", error);
    addNotification(`❌ Failed to resolve query`, 'error');
  }
};

const handleClearDone = async () => {
  try {
    const inquiriesToUpdate = inquiries.filter(inq => inq.status === "in-progress");
    
    for (const inquiry of inquiriesToUpdate) {
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_QUERIES_COLLECTION_ID!,
        inquiry.$id,
        { status: "resolved" }
      );
    }
    
    // Update local state
    setInquiries(prev => prev.map(inq => 
      inq.status === "in-progress" ? { ...inq, status: "resolved" as const } : inq
    ));
    
    if (selectedInquiry && selectedInquiry.status === "in-progress") {
      setSelectedInquiry({ ...selectedInquiry, status: "resolved" as const });
    }
    
    setShowClearDoneModal(false);
    addNotification(`✅ All in-progress queries resolved`, 'success');
    
    // Dispatch event to update sidebar
    dispatchMessagesUpdate();
  } catch (error) {
    console.error("Error clearing done inquiries:", error);
    addNotification(`❌ Failed to resolve all queries`, 'error');
  }
};

  // -------- UI HELPERS --------
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return { text: "Pending", icon: Clock, className: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300" };
      case "in-progress":
        return { text: "In Progress", icon: Check, className: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" };
      case "resolved":
        return { text: "Resolved", icon: CheckCircle, className: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" };
      default:
        return { text: status || "Pending", icon: Clock, className: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" };
    }
  };

  const getInquiryTypeBadge = (type: string) => {
    switch (type) {
      case "information":
        return { text: "Information", icon: Info, className: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" };
      case "complaint":
        return { text: "Complaint", icon: AlertCircle, className: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300" };
      case "other":
        return { text: "Other", icon: MessageCircle, className: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" };
      default:
        return { text: type || "Other", icon: MessageCircle, className: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" };
    }
  };

  const formatTime = (date: string) => {
    const now = new Date();
    const createdDate = new Date(date);
    const diff = now.getTime() - createdDate.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hours ago`;
    return `${days} days ago`;
  };

  const handleSelectInquiry = (inquiry: PropertyInquiry) => {
    setSelectedInquiry(inquiry);
    if (isMobile) {
      setShowMobileInquiryList(false);
    }
  };

  const handleBackToList = () => {
    if (isMobile) {
      setShowMobileInquiryList(true);
    }
  };

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  const getInquiryImages = (inquiry: PropertyInquiry) => {
    const images = [];
    if (inquiry.image1) images.push(inquiry.image1);
    if (inquiry.image2) images.push(inquiry.image2);
    if (inquiry.image3) images.push(inquiry.image3);
    return images;
  };

  // Count inquiries by status
  const pendingCount = inquiries.filter(inq => inq.status === "pending").length;
  const inProgressCount = inquiries.filter(inq => inq.status === "in-progress").length;

  // Filter inquiries
  const filteredInquiries = inquiries.filter(inq => {
    const matchesSearch = inq.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inq.propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inq.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || inq.inquiryType === filterCategory;
    const matchesStatus = filterStatus === "all" || inq.status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Calculate margin based on device and sidebar state
  const getMargin = () => {
    if (isMobile) {
      return 'ml-0';
    }
    return isSidebarCollapsed ? 'ml-16' : 'ml-64';
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className={`min-h-screen transition-colors duration-300 ${
          theme === "dark" 
            ? "bg-gray-900" 
            : "bg-gradient-to-br from-blue-50 via-white to-orange-50"
        }`}>
          <Sidebar />
          <div className={`transition-all duration-300 ease-in-out ${getMargin()}`}>
            <Header />
            <main className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-[var(--accent-500)] mx-auto" />
                  <p className={`mt-4 text-sm sm:text-base transition-colors duration-300 ${
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  }`}>
                    Loading inquiries...
                  </p>
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
      <div className={`min-h-screen transition-colors duration-300 ${
        theme === "dark" 
          ? "bg-gray-900" 
          : "bg-gradient-to-br from-blue-50 via-white to-orange-50"
      }`}>
        <Sidebar />
        <div className={`transition-all duration-300 ease-in-out ${getMargin()}`}>
          <Header />
          <main className="p-3 sm:p-4 md:p-6">
            <div className={`rounded-2xl shadow-md overflow-hidden h-[calc(100vh-140px)] transition-colors duration-300 border ${
              theme === "dark" 
                ? "bg-gray-800/80 border-gray-700" 
                : "bg-white/80 border-gray-100 backdrop-blur-sm"
            }`}>
              <div className="flex h-full">
                {/* Inquiries Sidebar */}
                <div className={`${isMobile ? (showMobileInquiryList ? 'w-full' : 'hidden') : 'w-80'} border-r flex flex-col transition-colors duration-300 ${
                  theme === "dark" ? "border-gray-700" : "border-gray-200"
                }`}>
                  <div className={`p-3 sm:p-4 border-b transition-colors duration-300 ${
                    theme === "dark" ? "border-gray-700" : "border-gray-200"
                  }`}>
                    <div className="flex items-center justify-between">
                      <h2 className={`text-base sm:text-lg font-bold flex items-center gap-1.5 sm:gap-2 transition-colors duration-300 ${
                        theme === "dark" ? "text-gray-100" : "text-gray-800"
                      }`}>
                        <MessageCircle className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors duration-300 ${
                          theme === "dark" ? "text-[var(--accent-400)]" : "text-[var(--accent-500)]"
                        }`} />
                        <span className="hidden xs:inline">Queries & Complaints</span>
                        <span className="xs:hidden">Queries</span>
                      </h2>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          theme === "dark" ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"
                        }`}>
                          {filteredInquiries.length}
                        </span>
                        {/* Notification Bell */}
                        <button
                          onClick={() => {
                            setShowNotifications(!showNotifications);
                            if (showNotifications) {
                              markAllAsRead();
                            }
                          }}
                          className={`relative p-1.5 rounded-lg transition-colors duration-200 ${
                            theme === "dark" 
                              ? "hover:bg-gray-700" 
                              : "hover:bg-gray-100"
                          }`}
                        >
                          <Bell className={`w-4 h-4 sm:w-5 sm:h-5 ${
                            theme === "dark" ? "text-gray-400" : "text-gray-500"
                          }`} />
                          {unreadNotifications > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center animate-pulse">
                              {unreadNotifications > 9 ? '9+' : unreadNotifications}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Real-time Status Indicator */}
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        isRealtimeEnabled ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                      }`} />
                      <span className={`text-[10px] ${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}>
                        {isRealtimeEnabled ? 'Live updates active' : 'Updates paused'}
                      </span>
                      <button
                        onClick={() => setIsRealtimeEnabled(!isRealtimeEnabled)}
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          isRealtimeEnabled 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {isRealtimeEnabled ? 'ON' : 'OFF'}
                      </button>
                    </div>

                    <div className="relative mt-2">
                      <Search className={`absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                        theme === "dark" ? "text-gray-400" : "text-gray-400"
                      }`} />
                      <input
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full pl-8 sm:pl-9 pr-3 sm:pr-4 py-1.5 sm:py-2 text-sm rounded-lg focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                          theme === "dark" 
                            ? "bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400" 
                            : "border border-gray-200 text-gray-900 bg-white"
                        }`}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mt-2">
                      <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs rounded-lg focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                          theme === "dark" 
                            ? "bg-gray-700 border-gray-600 text-gray-100" 
                            : "border border-gray-200 text-gray-900 bg-white"
                        }`}
                      >
                        <option value="all">All Categories</option>
                        <option value="information">Information</option>
                        <option value="complaint">Complaint</option>
                        <option value="other">Other</option>
                      </select>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs rounded-lg focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                          theme === "dark" 
                            ? "bg-gray-700 border-gray-600 text-gray-100" 
                            : "border border-gray-200 text-gray-900 bg-white"
                        }`}
                      >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="in-progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </div>
                    
                    {/* Quick action buttons */}
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {pendingCount > 0 && (
                        <div className={`text-xs px-2 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300`}>
                          {pendingCount} pending
                        </div>
                      )}
                      {inProgressCount > 0 && (
                        <>
                          <div className={`text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300`}>
                            {inProgressCount} in progress
                          </div>
                          <button
                            onClick={() => setShowClearDoneModal(true)}
                            className={`text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50 transition`}
                          >
                            Resolve All
                          </button>
                        </>
                      )}
                    </div>

                    {/* Notifications Dropdown */}
                    {showNotifications && (
                      <div className={`absolute left-0 right-0 top-full mt-2 rounded-lg shadow-lg border p-3 z-50 max-h-60 overflow-y-auto ${
                        theme === "dark" 
                          ? "bg-gray-800 border-gray-700" 
                          : "bg-white border-gray-200"
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className={`text-sm font-semibold ${
                            theme === "dark" ? "text-gray-200" : "text-gray-800"
                          }`}>
                            Notifications
                          </h4>
                          {notifications.length > 0 && (
                            <button
                              onClick={clearNotifications}
                              className={`text-xs ${
                                theme === "dark" ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700"
                              }`}
                            >
                              Clear all
                            </button>
                          )}
                        </div>
                        {notifications.length === 0 ? (
                          <p className={`text-sm text-center py-4 ${
                            theme === "dark" ? "text-gray-400" : "text-gray-500"
                          }`}>
                            No notifications
                          </p>
                        ) : (
                          notifications.map((notification) => (
                            <div
                              key={notification.id}
                              className={`p-2 rounded-lg mb-1 cursor-pointer transition-colors ${
                                theme === "dark" 
                                  ? "hover:bg-gray-700" 
                                  : "hover:bg-gray-50"
                              }`}
                              onClick={() => {
                                if (notification.inquiryId) {
                                  const inquiry = inquiries.find(i => i.$id === notification.inquiryId);
                                  if (inquiry) {
                                    handleSelectInquiry(inquiry);
                                    setShowNotifications(false);
                                  }
                                }
                              }}
                            >
                              <div className="flex items-start gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                                  notification.type === 'success' ? 'bg-green-500' :
                                  notification.type === 'error' ? 'bg-red-500' :
                                  notification.type === 'warning' ? 'bg-yellow-500' :
                                  'bg-blue-500'
                                }`} />
                                <div className="flex-1">
                                  <p className={`text-sm ${
                                    theme === "dark" ? "text-gray-200" : "text-gray-700"
                                  }`}>
                                    {notification.message}
                                  </p>
                                  <span className={`text-[10px] ${
                                    theme === "dark" ? "text-gray-400" : "text-gray-400"
                                  }`}>
                                    {new Date(notification.timestamp).toLocaleTimeString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {filteredInquiries.length === 0 ? (
                      <div className="text-center py-8 sm:py-12">
                        <MessageCircle className={`w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 transition-colors duration-300 ${
                          theme === "dark" ? "text-gray-600" : "text-gray-300"
                        }`} />
                        <p className={`text-sm sm:text-base transition-colors duration-300 ${
                          theme === "dark" ? "text-gray-400" : "text-gray-500"
                        }`}>
                          No queries found
                        </p>
                      </div>
                    ) : (
                      filteredInquiries.map((inq) => {
                        const status = getStatusBadge(inq.status);
                        const StatusIcon = status.icon;
                        const inquiryType = getInquiryTypeBadge(inq.inquiryType);
                        const TypeIcon = inquiryType.icon;
                        const hasImages = !!(inq.image1 || inq.image2 || inq.image3);
                        
                        return (
                          <button
                            key={inq.$id}
                            onClick={() => handleSelectInquiry(inq)}
                            className={`w-full p-3 sm:p-4 text-left transition border-b ${
                              theme === "dark" 
                                ? `border-gray-700 hover:bg-gray-700/50 ${
                                    selectedInquiry?.$id === inq.$id ? "bg-gray-700/50" : ""
                                  }`
                                : `border-gray-100 hover:bg-orange-50 ${
                                    selectedInquiry?.$id === inq.$id ? "bg-orange-50" : ""
                                  }`
                            }`}
                          >
                            <div className="flex items-start gap-2 sm:gap-3">
                              {inq.writerAvatar ? (
                                <Image
                                  src={inq.writerAvatar}
                                  alt={inq.tenantName}
                                  width={36}
                                  height={36}
                                  className="rounded-full object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                                  <span className="text-white font-semibold text-xs sm:text-sm">
                                    {inq.tenantName.charAt(0)}
                                  </span>
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className={`text-sm sm:text-base font-semibold truncate transition-colors duration-300 ${
                                    theme === "dark" ? "text-gray-100" : "text-gray-800"
                                  }`}>
                                    {inq.tenantName}
                                  </p>
                                  <span className={`text-[10px] sm:text-xs flex-shrink-0 ml-2 transition-colors duration-300 ${
                                    theme === "dark" ? "text-gray-400" : "text-gray-400"
                                  }`}>
                                    {formatTime(inq.createdAt)}
                                  </span>
                                </div>
                                <p className={`text-[10px] sm:text-xs truncate mt-0.5 transition-colors duration-300 ${
                                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                                }`}>
                                  Property: {inq.propertyName}
                                </p>
                                <div className="flex flex-wrap items-center gap-1 mt-1">
                                  <span className={`inline-flex items-center gap-0.5 sm:gap-1 px-1 sm:px-1.5 py-0.5 rounded-full text-[8px] sm:text-xs ${inquiryType.className}`}>
                                    <TypeIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                    <span className="hidden xs:inline">{inquiryType.text}</span>
                                  </span>
                                  <span className={`inline-flex items-center gap-0.5 sm:gap-1 px-1 sm:px-1.5 py-0.5 rounded-full text-[8px] sm:text-xs ${status.className}`}>
                                    <StatusIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                    <span className="hidden xs:inline">{status.text}</span>
                                  </span>
                                  {hasImages && (
                                    <span className={`inline-flex items-center gap-0.5 sm:gap-1 px-1 sm:px-1.5 py-0.5 rounded-full text-[8px] sm:text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300`}>
                                      <ImageIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                      <span className="hidden xs:inline">Images</span>
                                    </span>
                                  )}
                                </div>
                                <p className={`text-xs sm:text-sm line-clamp-2 mt-0.5 sm:mt-1 transition-colors duration-300 ${
                                  theme === "dark" ? "text-gray-300" : "text-gray-600"
                                }`}>
                                  {inq.message}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Inquiry Detail Area */}
                {selectedInquiry ? (
                  <div className={`${isMobile ? (showMobileInquiryList ? 'hidden' : 'w-full') : 'flex-1'} flex flex-col`}>
                    {/* Mobile Back Button */}
                    {isMobile && (
                      <div className={`p-2 border-b transition-colors duration-300 ${
                        theme === "dark" ? "border-gray-700" : "border-gray-200"
                      }`}>
                        <button
                          onClick={handleBackToList}
                          className={`flex items-center gap-1.5 text-sm transition-colors duration-300 ${
                            theme === "dark" ? "text-gray-400 hover:text-gray-200" : "text-gray-600 hover:text-gray-800"
                          }`}
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Back to queries
                        </button>
                      </div>
                    )}

                    <div className={`p-3 sm:p-4 border-b transition-colors duration-300 ${
                      theme === "dark" ? "border-gray-700" : "border-gray-200"
                    }`}>
                      <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2">
                        <div className="flex items-center gap-2 sm:gap-3">
                          {selectedInquiry.writerAvatar ? (
                            <Image
                              src={selectedInquiry.writerAvatar}
                              alt={selectedInquiry.tenantName}
                              width={36}
                              height={36}
                              className="rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold text-xs sm:text-sm">
                                {selectedInquiry.tenantName.charAt(0)}
                              </span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className={`text-sm sm:text-base font-semibold truncate transition-colors duration-300 ${
                              theme === "dark" ? "text-gray-100" : "text-gray-800"
                            }`}>
                              {selectedInquiry.tenantName}
                            </p>
                            <p className={`text-[10px] sm:text-xs truncate transition-colors duration-300 ${
                              theme === "dark" ? "text-gray-400" : "text-gray-500"
                            }`}>
                              {selectedInquiry.propertyName}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <button
                            onClick={() => setShowDetails(!showDetails)}
                            className={`p-1.5 sm:p-2 transition rounded-lg ${
                              showDetails 
                                ? `text-[var(--accent-500)] bg-[var(--accent-50)] dark:bg-[var(--accent-950)]/30 dark:text-[var(--accent-400)]`
                                : `text-gray-500 dark:text-gray-400 hover:text-[var(--accent-500)] hover:bg-[var(--accent-50)] dark:hover:bg-[var(--accent-950)]/30`
                            }`}
                          >
                            <Info className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Status and Actions */}
                      <div className={`flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t transition-colors duration-300 ${
                        theme === "dark" ? "border-gray-700" : "border-gray-100"
                      }`}>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          {(() => {
                            const inquiryType = getInquiryTypeBadge(selectedInquiry.inquiryType);
                            const TypeIcon = inquiryType.icon;
                            return <TypeIcon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                              theme === "dark" ? "text-gray-400" : "text-gray-400"
                            }`} />;
                          })()}
                          <span className={`text-xs sm:text-sm capitalize transition-colors duration-300 ${
                            theme === "dark" ? "text-gray-300" : "text-gray-600"
                          }`}>
                            {selectedInquiry.inquiryType}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          {selectedInquiry.status === "pending" && (
                            <button
                              onClick={() => handleMarkAsRead(selectedInquiry.$id)}
                              className="px-2 sm:px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] sm:text-sm rounded-lg transition flex items-center gap-1"
                            >
                              <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                              Mark as Read
                            </button>
                          )}
                          {selectedInquiry.status === "in-progress" && (
                            <>
                              <span className="px-2 sm:px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] sm:text-sm rounded-lg flex items-center gap-1">
                                <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                                In Progress
                              </span>
                              <button
                                onClick={() => handleResolve(selectedInquiry.$id)}
                                className="px-2 sm:px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-[10px] sm:text-sm rounded-lg transition flex items-center gap-1"
                              >
                                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                                Resolve
                              </button>
                            </>
                          )}
                          {selectedInquiry.status === "resolved" && (
                            <span className="px-2 sm:px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-[10px] sm:text-sm rounded-lg flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                              Resolved
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Query Message Display */}
                    <div className="flex-1 overflow-y-auto p-3 sm:p-4">
                      <div className="flex justify-start">
                        <div className="max-w-[85%] sm:max-w-[80%]">
                          <div className={`rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 transition-colors duration-300 ${
                            theme === "dark" ? "bg-gray-700" : "bg-gray-100"
                          }`}>
                            <p className={`text-sm sm:text-base whitespace-pre-wrap transition-colors duration-300 ${
                              theme === "dark" ? "text-gray-200" : "text-gray-800"
                            }`}>
                              {selectedInquiry.message}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <span className={`text-[10px] sm:text-xs transition-colors duration-300 ${
                              theme === "dark" ? "text-gray-400" : "text-gray-400"
                            }`}>
                              {new Date(selectedInquiry.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Images Section */}
                      {(() => {
                        const images = getInquiryImages(selectedInquiry);
                        if (images.length === 0) return null;
                        
                        return (
                          <div className="mt-4">
                            <div className="flex items-center gap-2 mb-2">
                              <ImageIcon className={`w-4 h-4 sm:w-5 sm:h-5 ${
                                theme === "dark" ? "text-gray-400" : "text-gray-500"
                              }`} />
                              <h4 className={`text-sm font-semibold transition-colors duration-300 ${
                                theme === "dark" ? "text-gray-200" : "text-gray-700"
                              }`}>
                                Attached Images ({images.length})
                              </h4>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                              {images.map((image, index) => (
                                <div
                                  key={index}
                                  onClick={() => handleImageClick(image)}
                                  className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-transform hover:scale-105 ${
                                    theme === "dark" ? "bg-gray-700" : "bg-gray-100"
                                  }`}
                                >
                                  <Image
                                    src={image}
                                    alt={`Image ${index + 1}`}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 640px) 50vw, 33vw"
                                  />
                                  <div className={`absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/40`}>
                                    <Eye className="w-6 h-6 text-white" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                      
                      {/* Show response if exists */}
                      {selectedInquiry.response && (
                        <div className="flex justify-end mt-3 sm:mt-4">
                          <div className="max-w-[85%] sm:max-w-[80%]">
                            <div className={`rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 transition-colors duration-300 ${
                              theme === "dark" 
                                ? "bg-[var(--accent-500)]" 
                                : "bg-[var(--accent-500)]"
                            }`}>
                              <p className="text-white text-sm sm:text-base whitespace-pre-wrap">{selectedInquiry.response}</p>
                            </div>
                            <div className="flex items-center justify-end gap-1 mt-1">
                              <span className={`text-[10px] sm:text-xs transition-colors duration-300 ${
                                theme === "dark" ? "text-gray-400" : "text-gray-400"
                              }`}>
                                Response sent
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div ref={messagesEndRef} />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center p-4">
                    <div className="text-center">
                      <MessageCircle className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 transition-colors duration-300 ${
                        theme === "dark" ? "text-gray-600" : "text-gray-300"
                      }`} />
                      <h3 className={`text-base sm:text-lg font-semibold transition-colors duration-300 ${
                        theme === "dark" ? "text-gray-200" : "text-gray-800"
                      }`}>
                        Select a query
                      </h3>
                      <p className={`text-sm sm:text-base transition-colors duration-300 ${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}>
                        Choose a query to view details and respond
                      </p>
                    </div>
                  </div>
                )}

                {/* Details Sidebar */}
                {showDetails && selectedInquiry && (
                  <div className={`fixed inset-y-0 right-0 w-72 sm:w-80 border-l p-4 overflow-y-auto transition-colors duration-300 z-50 ${
                    theme === "dark" ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"
                  }`}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`font-semibold transition-colors duration-300 ${
                        theme === "dark" ? "text-gray-100" : "text-gray-800"
                      }`}>
                        Query Details
                      </h3>
                      <button onClick={() => setShowDetails(false)} className={`p-1 transition-colors duration-300 ${
                        theme === "dark" ? "text-gray-400 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"
                      }`}>
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-3 sm:space-y-4">
                      <div>
                        <h4 className={`text-[10px] sm:text-xs font-semibold uppercase mb-0.5 sm:mb-1 transition-colors duration-300 ${
                          theme === "dark" ? "text-gray-400" : "text-gray-500"
                        }`}>
                          From
                        </h4>
                        <div className="flex items-center gap-2">
                          {selectedInquiry.writerAvatar ? (
                            <Image
                              src={selectedInquiry.writerAvatar}
                              alt={selectedInquiry.tenantName}
                              width={24}
                              height={24}
                              className="rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold text-xs">
                                {selectedInquiry.tenantName.charAt(0)}
                              </span>
                            </div>
                          )}
                          <p className={`text-sm sm:text-base transition-colors duration-300 ${
                            theme === "dark" ? "text-gray-200" : "text-gray-800"
                          }`}>
                            {selectedInquiry.tenantName}
                          </p>
                        </div>
                      </div>

                      <div>
                        <h4 className={`text-[10px] sm:text-xs font-semibold uppercase mb-0.5 sm:mb-1 transition-colors duration-300 ${
                          theme === "dark" ? "text-gray-400" : "text-gray-500"
                        }`}>
                          Property
                        </h4>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <Home className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors duration-300 ${
                            theme === "dark" ? "text-gray-400" : "text-gray-400"
                          }`} />
                          <p className={`text-sm sm:text-base transition-colors duration-300 ${
                            theme === "dark" ? "text-gray-200" : "text-gray-800"
                          }`}>
                            {selectedInquiry.propertyName}
                          </p>
                        </div>
                      </div>

                      <div>
                        <h4 className={`text-[10px] sm:text-xs font-semibold uppercase mb-0.5 sm:mb-1 transition-colors duration-300 ${
                          theme === "dark" ? "text-gray-400" : "text-gray-500"
                        }`}>
                          Category
                        </h4>
                        <p className={`text-sm sm:text-base capitalize transition-colors duration-300 ${
                          theme === "dark" ? "text-gray-200" : "text-gray-800"
                        }`}>
                          {selectedInquiry.inquiryType}
                        </p>
                      </div>

                      <div>
                        <h4 className={`text-[10px] sm:text-xs font-semibold uppercase mb-0.5 sm:mb-1 transition-colors duration-300 ${
                          theme === "dark" ? "text-gray-400" : "text-gray-500"
                        }`}>
                          Status
                        </h4>
                        <p className={`text-sm sm:text-base capitalize transition-colors duration-300 ${
                          theme === "dark" ? "text-gray-200" : "text-gray-800"
                        }`}>
                          {selectedInquiry.status}
                        </p>
                      </div>

                      <div>
                        <h4 className={`text-[10px] sm:text-xs font-semibold uppercase mb-0.5 sm:mb-1 transition-colors duration-300 ${
                          theme === "dark" ? "text-gray-400" : "text-gray-500"
                        }`}>
                          Submitted
                        </h4>
                        <p className={`text-xs sm:text-sm transition-colors duration-300 ${
                          theme === "dark" ? "text-gray-300" : "text-gray-600"
                        }`}>
                          {new Date(selectedInquiry.createdAt).toLocaleString()}
                        </p>
                      </div>

                      {/* Images in details sidebar */}
                      {(() => {
                        const images = getInquiryImages(selectedInquiry);
                        if (images.length === 0) return null;
                        
                        return (
                          <div>
                            <h4 className={`text-[10px] sm:text-xs font-semibold uppercase mb-1 sm:mb-2 transition-colors duration-300 ${
                              theme === "dark" ? "text-gray-400" : "text-gray-500"
                            }`}>
                              Attached Images
                            </h4>
                            <div className="space-y-1.5 sm:space-y-2">
                              {images.map((image, index) => (
                                <div
                                  key={index}
                                  onClick={() => handleImageClick(image)}
                                  className={`relative w-full aspect-video rounded-lg overflow-hidden cursor-pointer transition-transform hover:scale-[1.02] ${
                                    theme === "dark" ? "bg-gray-700" : "bg-gray-100"
                                  }`}
                                >
                                  <Image
                                    src={image}
                                    alt={`Image ${index + 1}`}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 640px) 100vw, 288px"
                                  />
                                  <div className={`absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/40`}>
                                    <Eye className="w-5 h-5 text-white" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Clear Done Modal */}
            {showClearDoneModal && inProgressCount > 0 && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className={`rounded-2xl p-5 sm:p-6 max-w-md w-full transition-colors duration-300 shadow-2xl ${
                  theme === "dark" ? "bg-gray-800" : "bg-white"
                }`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-full bg-green-100 dark:bg-green-900/30`}>
                      <CheckCircle className={`w-5 h-5 text-green-600 dark:text-green-400`} />
                    </div>
                    <h3 className={`text-lg sm:text-xl font-bold transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-100" : "text-gray-900"
                    }`}>
                      Resolve All In Progress
                    </h3>
                  </div>
                  
                  <p className={`text-sm sm:text-base mb-4 transition-colors duration-300 ${
                    theme === "dark" ? "text-gray-300" : "text-gray-600"
                  }`}>
                    You have <span className="font-semibold text-blue-600 dark:text-blue-400">{inProgressCount}</span> query{inProgressCount > 1 ? 's' : ''} marked as "In Progress". 
                    Would you like to mark {inProgressCount > 1 ? 'them all' : 'it'} as resolved?
                  </p>
                  
                  <div className="flex flex-col xs:flex-row gap-2 sm:gap-3">
                    <button
                      onClick={handleClearDone}
                      className={`flex-1 px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg transition flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium bg-green-600 hover:bg-green-700 text-white`}
                    >
                      <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      Yes, Resolve All
                    </button>
                    <button
                      onClick={() => setShowClearDoneModal(false)}
                      className={`flex-1 px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg transition flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium ${
                        theme === "dark"
                          ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Image Modal */}
            {showImageModal && selectedImage && (
              <div 
                className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
                onClick={() => setShowImageModal(false)}
              >
                <div 
                  className="relative max-w-4xl max-h-[90vh] w-full h-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setShowImageModal(false)}
                    className="absolute -top-12 right-0 text-white hover:text-gray-300 transition p-2"
                  >
                    <X className="w-8 h-8" />
                  </button>
                  <div className="relative w-full h-full">
                    <Image
                      src={selectedImage}
                      alt="Full size image"
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 100vw, 80vw"
                      quality={90}
                    />
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}