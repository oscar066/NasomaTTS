"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Search,
  BookOpen,
  Loader2,
  AlertCircle,
  Plus,
  ExternalLink,
} from "lucide-react";
import Sidebar from "../Dashboard/SideBar";
import { TopBar } from "../Dashboard/TopBar";
import { classicsApi, type GutenbergBook } from "@/lib/api";
import { useDocumentsStore } from "@/store/documents";
import { useClassicsStore, cacheKey } from "@/store/classics";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

// ── helpers

function formatAuthor(book: GutenbergBook): string {
  if (!book.authors.length) return "Unknown Author";
  const a = book.authors[0];
  // Gutenberg names are "Last, First" — flip them
  const parts = a.name.split(",").map((s) => s.trim());
  return parts.length === 2 ? `${parts[1]} ${parts[0]}` : a.name;
}

function coverUrl(book: GutenbergBook): string | null {
  return book.formats["image/jpeg"] ?? null;
}

// ── book card

type ImportState = "idle" | "loading" | "done";

function BookCard({ book, onImported }: { book: GutenbergBook; onImported: (docId: string, title: string) => void }) {
  const { data: session } = useSession();
  const router = useRouter();
  const addDocument = useDocumentsStore((s) => s.addDocument);
  const documents = useDocumentsStore((s) => s.documents);

  const existingDoc = documents.find(
    (d) => d.title.trim().toLowerCase() === book.title.trim().toLowerCase()
  );

  const [state, setState] = useState<ImportState>(existingDoc ? "done" : "idle");
  const [importedId, setImportedId] = useState<string | null>(existingDoc?.id ?? null);

  // Keep button state in sync with the store in both directions
  useEffect(() => {
    if (existingDoc && state !== "done") {
      setState("done");
      setImportedId(existingDoc.id);
    } else if (!existingDoc && state === "done") {
      setState("idle");
      setImportedId(null);
    }
  }, [existingDoc, state]);
  const cover = coverUrl(book);

  const handleImport = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!session?.accessToken) return;
    setState("loading");
    try {
      const doc = await classicsApi.import(book.id, session.accessToken);
      addDocument(doc);
      setImportedId(doc.id);
      setState("done");
      onImported(doc.id, doc.title);
    } catch (err: unknown) {
      const e2 = err as Error & { isPlanLimit?: boolean };
      setState("idle");
      if (e2.message?.toLowerCase().includes("already in your library")) {
        setState("done");
        toast.info("Already in your library", { description: `"${book.title}" is already in your library.` });
      } else if (e2.message?.toLowerCase().includes("plan limit") || e2.message?.toLowerCase().includes("upgrade")) {
        toast.error("Document limit reached", { description: "Upgrade to Pro for unlimited imports." });
      } else {
        toast.error("Import failed", { description: e2.message || "Could not import this book." });
      }
    }
  };

  return (
    <Card className="overflow-hidden flex flex-col group hover:border-primary/40 hover:shadow-md transition-all duration-200">
      {/* Cover */}
      <div className="relative w-full bg-muted/30 overflow-hidden flex-shrink-0" style={{ aspectRatio: "2/3", maxHeight: "220px" }}>
        {cover ? (
          <img
            src={cover}
            alt={`Cover of ${book.title}`}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-muted/40 to-muted/60 p-4">
            <BookOpen className="h-8 w-8 text-primary/40" />
            <div className="w-3/4 space-y-1.5 opacity-30">
              {[100, 85, 95, 75].map((w, i) => (
                <div key={i} className="h-1.5 bg-foreground rounded-full" style={{ width: `${w}%` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <CardContent className="p-3 flex flex-col gap-2 flex-1">
        <p className="text-sm font-semibold leading-snug line-clamp-2 min-h-[2.5rem]">{book.title}</p>
        <p className="text-xs text-muted-foreground truncate">{formatAuthor(book)}</p>

        {state === "done" ? (
          <Button
            size="sm"
            className="mt-auto bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 text-white w-full"
            onClick={() => importedId && router.push(`/documents/${importedId}`)}
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Open in Library
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={state === "loading"}
            onClick={handleImport}
            className="mt-auto w-full"
          >
            {state === "loading" ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5 mr-1.5" />
            )}
            {state === "loading" ? "Importing…" : "Add to Library"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function BookCardSkeleton() {
  return (
    <Card className="overflow-hidden flex flex-col">
      <Skeleton className="w-full rounded-none" style={{ aspectRatio: "2/3", maxHeight: "220px" }} />
      <CardContent className="p-3 flex flex-col gap-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-8 w-full mt-1" />
      </CardContent>
    </Card>
  );
}

// ── main page

export default function ClassicsPage() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() { router.push("/auth/login"); },
  });

  const classicsCache = useClassicsStore();

  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : true
  );
  const [books, setBooks]         = useState<GutenbergBook[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState("");
  const [pending, setPending]     = useState("");   // input value before debounce
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const debounceRef               = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onResize = () => setSidebarOpen(window.innerWidth >= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const fetchBooks = useCallback(async (q: string, p: number) => {
    if (!session?.accessToken) return;
    const key = cacheKey(q, p);
    const cached = classicsCache.get(key);
    if (cached) {
      setBooks(cached.books);
      setTotal(cached.total);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await classicsApi.browse(session.accessToken, q, p);
      classicsCache.set(key, data.results, data.count);
      setBooks(data.results);
      setTotal(data.count);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load catalog");
    } finally {
      setLoading(false);
    }
  }, [session, classicsCache]);

  // Initial load + refetch on search/page change
  useEffect(() => {
    if (status !== "authenticated") return;
    fetchBooks(search, page);
  }, [status, search, page, fetchBooks]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPending(e.target.value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(e.target.value);
      setPage(1);
    }, 500);
  };

  const handleImported = useCallback((docId: string, title: string) => {
    toast.success("Added to library", {
      description: `"${title}" is ready to read.`,
      action: { label: "Open", onClick: () => router.push(`/documents/${docId}`) },
    });
  }, [router]);

  const totalPages = Math.ceil(total / 32);

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
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">Classics</h1>
            </div>
            <p className="text-sm text-muted-foreground ml-12">
              Over 70,000 classic books — free to add to your library.
            </p>
          </div>

          {/* Search */}
          <div className="relative max-w-md mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by title, author, or subject…"
              value={pending}
              onChange={handleSearchChange}
              className="pl-9"
            />
          </div>

          {error && (
            <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-4 py-3 mb-6 text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Count */}
          {!loading && !error && (
            <p className="text-sm text-muted-foreground mb-4">
              {total.toLocaleString()} book{total !== 1 ? "s" : ""}
              {search ? ` matching "${search}"` : " available"}
            </p>
          )}

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {loading
              ? Array.from({ length: 12 }).map((_, i) => <BookCardSkeleton key={i} />)
              : books.map((book) => (
                  <BookCard key={book.id} book={book} onImported={handleImported} />
                ))
            }
          </div>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                Page {page} of {totalPages.toLocaleString()}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
