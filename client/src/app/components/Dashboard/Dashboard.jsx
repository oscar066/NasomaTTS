"use client";

import React, { useState } from "react";
import { TopBar } from "./TopBar";
import { FileCard } from "./FileCard";
import Sidebar from "./SideBar";
import { useRouter } from "next/navigation";
import { useQuery, gql } from "@apollo/client";
import { useSession } from "next-auth/react";

// get documents by author
const GET_DOCUMENTS_BY_AUTHOR = gql`
  query DocumentsByAuthor($email: String!) {
    documentsByAuthor(email: $email) {
      id
      title
      content
      author {
        id
        username
        email
      }
      createdAt
    }
  }
`;

export default function Dashboard() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push("/auth/login");
    },
  });

  const userEmail = session?.user?.email;

  const { loading, error, data } = useQuery(GET_DOCUMENTS_BY_AUTHOR, {
    variables: { email: userEmail },
    skip: !userEmail,
    fetchPolicy: "network-only",
    onError: (error) => {
      console.log("GraphQL Error:", error);
      if (error.message.toLowerCase().includes("unauthorized")) {
        router.push("/auth/login");
      }
    },
  });

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

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

  // console.log("Here is the data", data);

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
              <p>Error loading documents: {error.message}</p>
            </div>
          )}
          {!error &&
            (!data?.documentsByAuthor ||
              data.documentsByAuthor.length === 0) && (
              <p className="text-gray-600">
                No documents found. Upload a document to get started.
              </p>
            )}
          {data?.documentsByAuthor && data.documentsByAuthor.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.documentsByAuthor.map((doc) => (
                <FileCard key={doc.id} file={doc} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// export default dynamic(() => Promise.resolve(Dashboard), { ssr: false });
