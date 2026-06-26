"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { TopBar } from "../TopBar";
import { FileCard } from "./components/FileCard";
import Sidebar from "../SideBar";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { documentsApi } from "@/lib/api";
import { Upload, FileText, AlertCircle, Loader2, Crown } from "lucide-react";
import { useDocumentUpload } from "@/hooks/useDocumentUpload";
import { useDocumentsStore } from "@/store/documents";
import { toast } from "sonner";
import UpgradeModal from "@/components/ui/UpgradeModal";


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
        Upload a PDF to get started. Me Nasoma will turn it into natural audio you
        can listen to anywhere.
      </p>
      <button
        onClick={onUpload}
        disabled={isUploading}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 text-white text-sm font-medium transition-all shadow-md disabled:opacity-60"
      >
        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {isUploading ? "Uploading…" : "Upload your first PDF"}
      </button>
    </div>
  );
}

export default function UserDashboard() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : true
  );

  useEffect(() => {
    const onResize = () => setSidebarOpen(window.innerWidth >= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [isDragOver, setIsDragOver]   = useState(false);
  const dragCounterRef                = useRef(0);
  const fileInputRef                  = useRef<HTMLInputElement>(null);
  const { uploadDocument, isLoading: isUploading } = useDocumentUpload();
  const { documents, isLoaded, setDocuments, updateDocument, removeDocument } = useDocumentsStore();

  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() { router.push("/auth/login"); },
  });

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.email) return;
    if (isLoaded) return;

    const fetchDocs = async () => {
      try {
        setLoading(true);
        setError(null);
        const docs = await documentsApi.byAuthor(session.user.email, session.accessToken ?? "");
        setDocuments(docs);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load documents";
        setError(msg);
        if (msg.toLowerCase().includes("unauthorized")) router.push("/auth/login");
      } finally {
        setLoading(false);
      }
    };

    fetchDocs();
  }, [status, session, router, isLoaded, setDocuments]);

  const handleDelete = (deletedId: string) => removeDocument(deletedId);
  const handleRename = (id: string, newTitle: string) => updateDocument(id, { title: newTitle });

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
      const shortName = file.name.length > 40 ? `${file.name.slice(0, 37)}…` : file.name;
      toast.success("Document uploaded", { description: `"${shortName}" has been processed and saved.` });
      if (result?.id) router.push(`/documents/${result.id}`);
    } catch (err: unknown) {
      const e = err as Error & { isPlanLimit?: boolean };
      if (e.isPlanLimit) {
        setShowUpgrade(true);
      } else {
        const msg = e.message || "An error occurred during upload.";
        toast.error("Upload failed", { description: msg });
      }
    } finally {
      event.target.value = "";
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current += 1;
    if (e.dataTransfer.types.includes("Files")) setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Invalid file type", { description: "Please drop a PDF file." });
      return;
    }
    try {
      const result = await uploadDocument(file);
      const shortName = file.name.length > 40 ? `${file.name.slice(0, 37)}…` : file.name;
      toast.success("Document uploaded", { description: `"${shortName}" has been processed and saved.` });
      if (result?.id) router.push(`/documents/${result.id}`);
    } catch (err: unknown) {
      const e2 = err as Error & { isPlanLimit?: boolean };
      if (e2.isPlanLimit) setShowUpgrade(true);
      else toast.error("Upload failed", { description: e2.message || "An error occurred during upload." });
    }
  }, [uploadDocument, router]);

  const firstName     = session?.user?.name?.split(" ")[0] ?? "there";
  const isInitialLoad    = loading && !isLoaded;
  const userPlan         = session?.user?.plan ?? "free";
  const isFree           = userPlan === "free";
  const FREE_LIMIT       = 5;
  const filteredDocs  = searchQuery.trim()
    ? documents.filter((d) => d.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : documents;

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div
      className="flex h-screen bg-background overflow-hidden"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Sidebar isOpen={sidebarOpen} />

      <UpgradeModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        title="Document limit reached"
        description={`Free plan allows up to ${FREE_LIMIT} documents. Upgrade to Pro for unlimited uploads.`}
      />

      {/* Drag-and-drop overlay */}
      {isDragOver && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm border-2 border-dashed border-primary rounded-none pointer-events-none">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Upload className="h-10 w-10 text-primary" />
          </div>
          <p className="text-xl font-semibold">Drop your PDF here</p>
          <p className="text-sm text-muted-foreground mt-1">Release to upload</p>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar onToggleSidebar={() => setSidebarOpen((p) => !p)} onSearch={setSearchQuery} />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">
                {isInitialLoad ? "Your Library" : `Hey, ${firstName} 👋`}
              </h1>
              {!isInitialLoad && !error && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {documents.length === 0
                    ? "Your library is empty. Upload a PDF to get started."
                    : searchQuery
                    ? `${filteredDocs.length} result${filteredDocs.length !== 1 ? "s" : ""} for "${searchQuery}"`
                    : `${documents.length} document${documents.length !== 1 ? "s" : ""} in your library`}
                </p>
              )}
            </div>
            {!isInitialLoad && isFree && (
              <button
                onClick={() => setShowUpgrade(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors flex-shrink-0"
              >
                <Crown className="h-3.5 w-3.5" />
                {documents.length}/{FREE_LIMIT} uploads · Go Pro
              </button>
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
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {!isInitialLoad && !error && documents.length === 0 && (
            <>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="application/pdf" />
              <EmptyState onUpload={() => fileInputRef.current?.click()} isUploading={isUploading} />
            </>
          )}

          {!isInitialLoad && documents.length > 0 && (
            <>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="application/pdf" />
              {filteredDocs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <p className="text-sm text-muted-foreground">No documents match your search.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                  {filteredDocs.map((doc) => (
                    <FileCard key={doc.id} file={doc} onDelete={handleDelete} onRename={handleRename} />
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
