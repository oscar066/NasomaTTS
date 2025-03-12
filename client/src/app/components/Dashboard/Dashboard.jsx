"use client";

import React, { useState, useEffect } from "react";
import { TopBar } from "./TopBar";
import { FileCard } from "./FileCard";
import Sidebar from "./SideBar";
import { useRouter } from "next/navigation";
import { useQuery, gql } from "@apollo/client";

// Graphql query
const GET_DOCUMENTS = gql`
  query Documents {
    documents {
      id
      title
      content
      author {
        id
        username
      }
      createdAt
    }
  }
`;

export default function Dashboard() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/login");
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  const { loading, error, data } = useQuery(GET_DOCUMENTS, {
    skip: !isAuthenticated,
    fetchPolicy: "network-only",
    onError: (error) => {
      console.error("GraphQL Error:", error);
      if (error.message.toLowerCase().includes("unauthorized")) {
        localStorage.removeItem("token");
        router.push("/auth/login");
      }
    },
  });

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-red-500">Error: {error.message}</p>
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
          {!data?.documents?.length ? (
            <p className="text-gray-600">
              No documents found. Upload a document to get started.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.documents.map((doc) => (
                <FileCard key={doc.id} file={doc} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
