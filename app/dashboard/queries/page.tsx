"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { databases } from "@/lib/appwrite/config";
import { Query as AppwriteQuery } from "appwrite";
import Image from "next/image";
import Link from "next/link";
import {
  MessageSquare,
  Search,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  Info,
  FileText,
  Home,
  User,
  Calendar,
  Reply,
  X,
  Mail,
  Phone,
  Filter,
} from "lucide-react";

interface QueryDoc {
  $id: string;
  writer: string;
  body: string;
  referenceProperty: string;
  category: "information" | "complaint" | "other";
  avatar?: string;
  snap?: string;
  status: "pending" | "resolved" | "in-progress";
  response?: string;
  $createdAt: string;
  $updatedAt: string;
}

export default function QueriesPage() {
  const { organization } = useAuth();
  const { theme } = useTheme();
  const [queries, setQueries] = useState<QueryDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedQuery, setSelectedQuery] = useState<QueryDoc | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseText, setResponseText] = useState("");

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
      setQueries(response.documents as unknown as QueryDoc[]);
    } catch (error) {
      console.error("Error fetching queries:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (queryId: string, newStatus: string) => {
    try {
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_QUERIES_COLLECTION_ID!,
        queryId,
        { status: newStatus }
      );
      fetchQueries();
      if (selectedQuery?.$id === queryId) {
        setSelectedQuery({ ...selectedQuery, status: newStatus as any });
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleRespond = async () => {
    if (!selectedQuery || !responseText.trim()) return;

    try {
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_QUERIES_COLLECTION_ID!,
        selectedQuery.$id,
        {
          response: responseText,
          status: "resolved",
          respondedAt: new Date().toISOString(),
        }
      );
      setShowResponseModal(false);
      setResponseText("");
      fetchQueries();
    } catch (error) {
      console.error("Error sending response:", error);
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "information":
        return { text: "Information", icon: Info, className: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" };
      case "complaint":
        return { text: "Complaint", icon: AlertCircle, className: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300" };
      case "other":
        return { text: "Other", icon: MessageSquare, className: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" };
      default:
        return { text: category, icon: FileText, className: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return { text: "Pending", icon: Clock, className: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300" };
      case "in-progress":
        return { text: "In Progress", icon: Clock, className: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" };
      case "resolved":
        return { text: "Resolved", icon: CheckCircle, className: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" };
      default:
        return { text: status, icon: Clock, className: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" };
    }
  };

  const filteredQueries = queries.filter(query => {
    const matchesSearch = query.body.toLowerCase().includes(searchTerm.toLowerCase()) ||
      query.writer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      query.referenceProperty.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || query.category === filterCategory;
    const matchesStatus = filterStatus === "all" || query.status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const pendingCount = queries.filter(q => q.status === "pending").length;
  const inProgressCount = queries.filter(q => q.status === "in-progress").length;
  const resolvedCount = queries.filter(q => q.status === "resolved").length;

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className={`min-h-screen transition-colors duration-300 ${
          theme === "dark" 
            ? "bg-gray-900" 
            : "bg-gradient-to-br from-blue-50 via-white to-orange-50"
        }`}>
          <Sidebar />
          <div className="ml-64">
            <Header />
            <main className="p-6">
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-500)] mx-auto" />
                  <p className={`mt-4 transition-colors duration-300 ${
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  }`}>
                    Loading queries...
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
        <div className="ml-64">
          <Header />
          <main className="p-6">
            {/* Header Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className={`text-2xl font-bold transition-colors duration-300 ${
                    theme === "dark" ? "text-gray-100" : "text-gray-900"
                  }`}>
                    Queries & Complaints
                  </h1>
                  <p className={`text-sm mt-1 transition-colors duration-300 ${
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  }`}>
                    Manage tenant inquiries, complaints, and feedback
                  </p>
                </div>
              </div>
            </div>

            {/* Stats Cards - Premium */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className={`rounded-xl p-4 border transition-colors duration-300 ${
                theme === "dark" 
                  ? "bg-gray-800/80 border-gray-700" 
                  : "bg-white/80 border-gray-100 backdrop-blur-sm"
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}>
                      Pending
                    </p>
                    <p className={`text-2xl font-bold transition-colors duration-300 ${
                      theme === "dark" ? "text-yellow-400" : "text-yellow-600"
                    }`}>
                      {pendingCount}
                    </p>
                  </div>
                  <div className={`p-3 rounded-full ${
                    theme === "dark" ? "bg-yellow-900/30" : "bg-yellow-100"
                  }`}>
                    <Clock className={`w-5 h-5 ${
                      theme === "dark" ? "text-yellow-400" : "text-yellow-600"
                    }`} />
                  </div>
                </div>
              </div>

              <div className={`rounded-xl p-4 border transition-colors duration-300 ${
                theme === "dark" 
                  ? "bg-gray-800/80 border-gray-700" 
                  : "bg-white/80 border-gray-100 backdrop-blur-sm"
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}>
                      In Progress
                    </p>
                    <p className={`text-2xl font-bold transition-colors duration-300 ${
                      theme === "dark" ? "text-blue-400" : "text-blue-600"
                    }`}>
                      {inProgressCount}
                    </p>
                  </div>
                  <div className={`p-3 rounded-full ${
                    theme === "dark" ? "bg-blue-900/30" : "bg-blue-100"
                  }`}>
                    <AlertCircle className={`w-5 h-5 ${
                      theme === "dark" ? "text-blue-400" : "text-blue-600"
                    }`} />
                  </div>
                </div>
              </div>

              <div className={`rounded-xl p-4 border transition-colors duration-300 ${
                theme === "dark" 
                  ? "bg-gray-800/80 border-gray-700" 
                  : "bg-white/80 border-gray-100 backdrop-blur-sm"
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}>
                      Resolved
                    </p>
                    <p className={`text-2xl font-bold transition-colors duration-300 ${
                      theme === "dark" ? "text-green-400" : "text-green-600"
                    }`}>
                      {resolvedCount}
                    </p>
                  </div>
                  <div className={`p-3 rounded-full ${
                    theme === "dark" ? "bg-green-900/30" : "bg-green-100"
                  }`}>
                    <CheckCircle className={`w-5 h-5 ${
                      theme === "dark" ? "text-green-400" : "text-green-600"
                    }`} />
                  </div>
                </div>
              </div>
            </div>

            {/* Search and Filters - Premium Styling */}
            <div className={`rounded-xl shadow-sm p-4 mb-6 transition-colors duration-300 border ${
              theme === "dark" 
                ? "bg-gray-800/80 border-gray-700" 
                : "bg-white/80 border-gray-100 backdrop-blur-sm"
            }`}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                    theme === "dark" ? "text-gray-400" : "text-gray-400"
                  }`} />
                  <input
                    type="text"
                    placeholder="Search by tenant, property, or message..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                      theme === "dark" 
                        ? "bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400" 
                        : "border border-gray-200 text-gray-900 bg-white"
                    }`}
                  />
                </div>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className={`px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
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
                  className={`px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
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
            </div>

            {/* Queries Grid - Premium Cards */}
            {filteredQueries.length === 0 ? (
              <div className={`rounded-2xl shadow-sm p-16 text-center transition-colors duration-300 border ${
                theme === "dark" 
                  ? "bg-gray-800/80 border-gray-700" 
                  : "bg-white/80 border-gray-100 backdrop-blur-sm"
              }`}>
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  theme === "dark" ? "bg-gray-700" : "bg-gray-100"
                }`}>
                  <MessageSquare className={`w-10 h-10 ${
                    theme === "dark" ? "text-gray-500" : "text-gray-400"
                  }`} />
                </div>
                <h3 className={`text-lg font-semibold mb-2 transition-colors duration-300 ${
                  theme === "dark" ? "text-gray-200" : "text-gray-800"
                }`}>
                  No queries found
                </h3>
                <p className={`transition-colors duration-300 ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}>
                  No tenant queries match your search criteria
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredQueries.map((query) => {
                  const category = getCategoryBadge(query.category);
                  const CategoryIcon = category.icon;
                  const status = getStatusBadge(query.status);
                  const StatusIcon = status.icon;
                  
                  return (
                    <div
                      key={query.$id}
                      className={`group rounded-xl shadow-sm p-5 hover:shadow-md transition-all duration-300 cursor-pointer border ${
                        theme === "dark" 
                          ? `bg-gray-800/80 border-gray-700 hover:border-gray-600 hover:shadow-gray-900/50 ${
                              selectedQuery?.$id === query.$id ? "border-[var(--accent-500)]" : ""
                            }`
                          : `bg-white/80 border-gray-100 hover:border-[var(--accent-200)] hover:shadow-lg backdrop-blur-sm ${
                              selectedQuery?.$id === query.$id ? "border-[var(--accent-500)]" : ""
                            }`
                      }`}
                      onClick={() => setSelectedQuery(query)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          {/* Avatar - Premium */}
                          {query.avatar ? (
                            <div className="relative">
                              <Image
                                src={query.avatar}
                                alt={query.writer}
                                width={48}
                                height={48}
                                className="rounded-full object-cover ring-2 ring-[var(--accent-500)]/20"
                              />
                              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 ${
                                theme === "dark" ? "border-gray-800" : "border-white"
                              } ${
                                query.status === "pending" ? "bg-yellow-500" :
                                query.status === "in-progress" ? "bg-blue-500" :
                                "bg-green-500"
                              }`} />
                            </div>
                          ) : (
                            <div className={`relative w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                              theme === "dark" 
                                ? "bg-gray-700" 
                                : "bg-gradient-to-br from-blue-500 to-blue-600"
                            }`}>
                              <User className={`w-6 h-6 ${
                                theme === "dark" ? "text-gray-400" : "text-white"
                              }`} />
                              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 ${
                                theme === "dark" ? "border-gray-800" : "border-white"
                              } ${
                                query.status === "pending" ? "bg-yellow-500" :
                                query.status === "in-progress" ? "bg-blue-500" :
                                "bg-green-500"
                              }`} />
                            </div>
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <span className={`font-semibold transition-colors duration-300 ${
                                theme === "dark" ? "text-gray-100" : "text-gray-800"
                              }`}>
                                {query.writer}
                              </span>
                              <span className={`text-xs transition-colors duration-300 ${
                                theme === "dark" ? "text-gray-400" : "text-gray-400"
                              }`}>
                                <Calendar className="w-3 h-3 inline mr-1" />
                                {new Date(query.$createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${category.className}`}>
                                <CategoryIcon className="w-3 h-3" />
                                {category.text}
                              </span>
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${status.className}`}>
                                <StatusIcon className="w-3 h-3" />
                                {status.text}
                              </span>
                            </div>
                            <p className={`text-sm line-clamp-2 mb-2 transition-colors duration-300 ${
                              theme === "dark" ? "text-gray-300" : "text-gray-700"
                            }`}>
                              {query.body}
                            </p>
                            <div className={`flex items-center gap-2 text-xs transition-colors duration-300 ${
                              theme === "dark" ? "text-gray-400" : "text-gray-500"
                            }`}>
                              <Home className="w-3 h-3" />
                              <span>Property: {query.referenceProperty}</span>
                            </div>
                            {query.response && (
                              <div className={`mt-2 p-2 rounded-lg text-xs transition-colors duration-300 ${
                                theme === "dark" 
                                  ? "bg-green-900/20 text-green-300" 
                                  : "bg-green-50 text-green-700"
                              }`}>
                                <CheckCircle className="w-3 h-3 inline mr-1" />
                                Responded
                              </div>
                            )}
                          </div>
                        </div>
                        <button className={`p-2 rounded-lg transition-colors duration-300 ${
                          theme === "dark" 
                            ? "text-gray-400 hover:text-[var(--accent-400)] hover:bg-gray-700" 
                            : "text-gray-400 hover:text-[var(--accent-500)] hover:bg-[var(--accent-50)]"
                        }`}>
                          <Eye className="w-5 h-5" />
                        </button>
                      </div>
                      
                      {/* Action Buttons for selected query */}
                      {selectedQuery?.$id === query.$id && (
                        <div className={`mt-4 pt-4 border-t flex gap-3 ${
                          theme === "dark" ? "border-gray-700" : "border-gray-100"
                        }`}>
                          {query.status !== "resolved" && (
                            <>
                              {query.status === "pending" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusUpdate(query.$id, "in-progress");
                                  }}
                                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                                    theme === "dark"
                                      ? "bg-blue-900/30 text-blue-400 hover:bg-blue-900/50"
                                      : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                                  }`}
                                >
                                  Mark In Progress
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedQuery(query);
                                  setShowResponseModal(true);
                                }}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                                  theme === "dark"
                                    ? "bg-[var(--accent-500)] text-white hover:bg-[var(--accent-600)]"
                                    : "bg-[var(--accent-500)] text-white hover:bg-[var(--accent-600)]"
                                }`}
                              >
                                <Reply className="w-4 h-4 inline mr-1.5" />
                                Respond
                              </button>
                            </>
                          )}
                          {query.status === "resolved" && (
                            <span className={`px-4 py-2 rounded-lg text-sm font-medium ${
                              theme === "dark"
                                ? "bg-green-900/30 text-green-400"
                                : "bg-green-100 text-green-700"
                            }`}>
                              <CheckCircle className="w-4 h-4 inline mr-1.5" />
                              Resolved
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Response Modal - Premium Styling */}
            {showResponseModal && selectedQuery && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                <div className={`rounded-2xl p-6 max-w-2xl w-full mx-4 transition-colors duration-300 shadow-2xl ${
                  theme === "dark" ? "bg-gray-800" : "bg-white"
                }`}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className={`text-xl font-bold transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-100" : "text-gray-900"
                    }`}>
                      Respond to Query
                    </h3>
                    <button onClick={() => setShowResponseModal(false)} className={`transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-400 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"
                    }`}>
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className={`mb-4 p-4 rounded-lg transition-colors duration-300 ${
                    theme === "dark" ? "bg-gray-700" : "bg-gray-50"
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <User className={`w-4 h-4 ${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`} />
                      <p className={`text-sm font-medium transition-colors duration-300 ${
                        theme === "dark" ? "text-gray-200" : "text-gray-800"
                      }`}>
                        {selectedQuery.writer}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <Home className={`w-4 h-4 ${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`} />
                      <p className={`text-sm transition-colors duration-300 ${
                        theme === "dark" ? "text-gray-300" : "text-gray-600"
                      }`}>
                        Property: {selectedQuery.referenceProperty}
                      </p>
                    </div>
                    <div className={`mt-3 p-3 rounded-lg transition-colors duration-300 ${
                      theme === "dark" ? "bg-gray-600/50" : "bg-white"
                    }`}>
                      <p className={`text-sm transition-colors duration-300 ${
                        theme === "dark" ? "text-gray-300" : "text-gray-700"
                      }`}>
                        {selectedQuery.body}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-semibold mb-2 transition-colors duration-300 ${
                      theme === "dark" ? "text-gray-200" : "text-gray-800"
                    }`}>
                      Your Response
                    </label>
                    <textarea
                      rows={4}
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      placeholder="Type your response here..."
                      className={`w-full px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-[var(--accent-500)] transition-colors duration-300 ${
                        theme === "dark" 
                          ? "bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400" 
                          : "border border-gray-200 text-gray-900 bg-white"
                      }`}
                    />
                  </div>
                  
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={handleRespond}
                      disabled={!responseText.trim()}
                      className={`flex-1 px-4 py-2.5 rounded-lg transition disabled:opacity-50 font-medium flex items-center justify-center gap-2 ${
                        theme === "dark"
                          ? "bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white"
                          : "bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white"
                      }`}
                    >
                      <Reply className="w-4 h-4" />
                      Send Response
                    </button>
                    <button
                      onClick={() => setShowResponseModal(false)}
                      className={`flex-1 px-4 py-2.5 rounded-lg transition font-medium ${
                        theme === "dark"
                          ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      Cancel
                    </button>
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