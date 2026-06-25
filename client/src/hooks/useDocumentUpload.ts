import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { pdfApi, Document } from "@/lib/api";
import { useDocumentsStore } from "@/store/documents";

export const useDocumentUpload = () => {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push("/auth/login");
    },
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addDocument = useDocumentsStore((s) => s.addDocument);

  const uploadDocument = async (file: File): Promise<Document> => {
    if (!file) throw new Error("No file provided");

    if (status === "loading") throw new Error("Session loading, please wait...");

    const token = session?.accessToken;
    if (!token) throw new Error("No access token found");

    try {
      setIsLoading(true);
      setError(null);

      // PDF upload now creates the document record server-side, so page data
      // never travels through the Next.js proxy.  The response is a full Document.
      const doc = await pdfApi.upload(file, token);
      addDocument(doc);
      return doc;
    } catch (err: unknown) {
      const msg = (err as Error)?.message || "An error occurred during upload";
      setError(msg);
      if (msg.toLowerCase().includes("unauthorized")) {
        router.push("/auth/login");
      }
      const enriched = new Error(msg) as Error & { isPlanLimit?: boolean };
      enriched.isPlanLimit = msg.toLowerCase().includes("free plan limit");
      throw enriched;
    } finally {
      setIsLoading(false);
    }
  };

  return { uploadDocument, isLoading, error, status };
};
