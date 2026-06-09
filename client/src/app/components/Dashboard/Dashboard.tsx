"use client";

import React, { useState, useEffect, useRef } from "react";
import { TopBar } from "./TopBar";
import { FileCard } from "./FileCard";
import Sidebar from "./SideBar";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { documentsApi } from "@/lib/api";
import { Upload, FileText, AlertCircle, Loader2 } from "lucide-react";
import { useDocumentUpload } from "@/hooks/useDocumentUpload";
import { useDocumentsStore } from "@/store/documents";
import { toast } from "sonner";

function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col animate-pulse">
      <div className="w-full bg-secondary" style={{ aspectRatio: "3/4", maxHeight: "240px" }} />
      <div className="p-3 flex flex-col gap-2">
        <div className="h-3.5 bg-secondary rounded w-3/4" />
        <div className="flex items-center gap-2">
          <div className="h-11 w-11 bg-secondary rounded-full flex-shrink-0" />
          <div className="h-3 bg-secondary rounded flex-1" />
          <div className="h-7 w-14 bg-secondary rounded flex-shrink-0" />
        </div>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  onUpload: () => void;
  isUploading: boolean;
}

function EmptyState({ onUpload, isUploading }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
        <FileText className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-6">
        Upload a PDF to get started. Nasoma will turn it into natural audio you
        can listen to anywhere.
      </p>
      <button
        onClick={onUpload}
        disabled={isUploading}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 text-white text-sm font-medium transition-all shadow-md disabled:opacity-60"
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        {isUploading ? "Uploading…" : "Upload your first PDF"}
      </button>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadDocument, isLoading: isUploading } = useDocumentUpload();

  const { documents, isLoaded, setDocuments, addDocument, updateDocument, removeDocument } =
    useDocumentsStore();

  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push("/auth/login");
    },
  });

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.email) return;
    // Skip fetch if the store already has the list for this session.
    if (isLoaded) return;

    const fetchDocs = async () => {
      try {
        setLoading(true);
        setError(null);
        const docs = await documentsApi.byAuthor(
          session.user.email,
          session.accessToken ?? ""
        );
        setDocuments(docs);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load documents";
        setError(msg);
        if (msg.toLowerCase().includes("unauthorized")) {
          router.push("/auth/login");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDocs();
  }, [status, session, router, isLoaded, setDocuments]);

  const handleDelete = (deletedId: string) => removeDocument(deletedId);

  const handleRename = (id: string, newTitle: string) =>
    updateDocument(id, { title: newTitle });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Invalid file type", { description: "Please upload a PDF file." });
      event.target.value = "";
      return;
    }

    try {
      const result = await uploadDocument(file);
      toast.success("Document uploaded", {
        description: `${file.name} has been processed and saved.`,
      });
      if (result?.id) {
        addDocument(result);
        router.push(`/documents/${result.id}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred during upload.";
      toast.error("Upload failed", { description: msg });
    } finally {
      event.target.value = "";
    }
  };

  const firstName = session?.user?.name?.split(" ")[0] ?? "there";
  const isInitialLoad = loading && !isLoaded;

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar isOpen={sidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar onToggleSidebar={() => setSidebarOpen((p) => !p)} />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">
              {isInitialLoad ? "Your Library" : `Hey, ${firstName} 👋`}
            </h1>
            {!isInitialLoad && !error && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {documents.length === 0
                  ? "Your library is empty — upload a PDF to get started."
                  : `${documents.length} document${documents.length !== 1 ? "s" : ""} in your library`}
              </p>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg px-4 py-3 mb-6 text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Could not load documents: {error}</span>
            </div>
          )}

          {isInitialLoad && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {!isInitialLoad && !error && documents.length === 0 && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="application/pdf"
              />
              <EmptyState
                onUpload={() => fileInputRef.current?.click()}
                isUploading={isUploading}
              />
            </>
          )}

          {!isInitialLoad && documents.length > 0 && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="application/pdf"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {documents.map((doc) => (
                  <FileCard
                    key={doc.id}
                    file={doc}
                    onDelete={handleDelete}
                    onRename={handleRename}
                  />
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
