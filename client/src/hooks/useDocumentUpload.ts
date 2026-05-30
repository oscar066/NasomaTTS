import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { pdfApi, documentsApi, Document } from "@/lib/api";

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

  const uploadDocument = async (file: File): Promise<Document> => {
    if (!file) throw new Error("No file provided");

    if (status === "loading") throw new Error("Session loading, please wait...");

    const token = session?.accessToken;
    if (!token) throw new Error("No access token found");

    try {
      setIsLoading(true);
      setError(null);

      const { content, pdf_url, thumbnail_url, pages } = await pdfApi.upload(file, token);
      const title = file.name.replace(/\.[^/.]+$/, "");

      return await documentsApi.create({ title, content, pdf_url, thumbnail_url, pages }, token);
    } catch (err: unknown) {
      const msg = (err as Error)?.message || "An error occurred during upload";
      setError(msg);
      if (msg.toLowerCase().includes("unauthorized")) {
        router.push("/auth/login");
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { uploadDocument, isLoading, error, status };
};
