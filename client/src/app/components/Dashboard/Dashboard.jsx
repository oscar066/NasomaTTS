"use client";

import React, { useState, useEffect } from "react";
import { TopBar } from "./TopBar";
import { FileCard } from "./FileCard";
import Sidebar from "./SideBar";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { documentsApi } from "@/lib/api";

export default function Dashboard() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push("/auth/login");
    },
  });

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.email) return;

    const fetchDocs = async () => {
      try {
        setLoading(true);
        setError(null);
        const docs = await documentsApi.byAuthor(
          session.user.email,
          session.accessToken
        );
        setDocuments(docs);
      } catch (err) {
        setError(err.message || "Failed to load documents");
        if (err.message?.toLowerCase().includes("unauthorized")) {
          router.push("/auth/login");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDocs();
  }, [status, session]);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-600">Checking authentication...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-600">Loading documents...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar isOpen={sidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar onToggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          <h1 className="text-2xl font-semibold mb-6">Your Library</h1>
          {error && (
            <div
              className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6"
              role="alert"
            >
              <p>Error loading documents: {error}</p>
            </div>
          )}
          {!error && documents.length === 0 && (
            <p className="text-gray-600">
              No documents found. Upload a document to get started.
            </p>
          )}
          {documents.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {documents.map((doc) => (
                <FileCard key={doc.id} file={doc} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
