import { useState } from "react";
import axios from "axios";
import { useMutation } from "@apollo/client";
import { gql } from "@apollo/client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

// Define the type for the mutation response
interface CreateDocData {
  createDoc: {
    id: string;
    title: string;
    content: string;
    author: {
      id: string;
      username: string;
      email: string;
      avatar: string;
      createdAt: string;
      updatedAt: string;
    };
    createdAt: string;
    updatedAt: string;
  };
}

interface UploadResponse {
  data: {
    content: string;
  };
}

// GraphQL mutation
const CREATE_DOC = gql`
  mutation CreateDoc($title: String!, $content: String!) {
    createDoc(title: $title, content: $content) {
      id
      title
      content
      author {
        id
        username
        email
        avatar
        createdAt
        updatedAt
      }
      createdAt
      updatedAt
    }
  }
`;

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

  // Initialize the mutation
  const [createDocMutation] = useMutation(CREATE_DOC, {
    context: {
      headers: {
        authorization: `Bearer ${session?.accessToken}`,
      },
    },
  });

  const uploadDocument = async (
    file: File
  ): Promise<CreateDocData["createDoc"]> => {
    if (!file) throw new Error("No file provided");

    // Handle authentication states
    switch (status as "loading" | "authenticated" | "unauthenticated") {
      case "loading":
        throw new Error("Session loading, please wait...");

      case "unauthenticated":
        router.push("/auth/login");
        throw new Error("Please sign in to upload documents");
        
      case "authenticated":
        if (!session?.accessToken) {
          throw new Error("User email not found");
        }
        break;
    }

    try {
      setIsLoading(true);
      setError(null);

      // First, extract text from PDF
      const formData = new FormData();
      formData.append("pdf", file);

      const response: UploadResponse = await axios.post(
        "http://localhost:5000/api/pdf/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            //Authorization: `Bearer ${session?.user?.email}`,
          },
        }
      );

      const extractedText: string = response.data.content;
      const title: string = file.name.replace(/\.[^/.]+$/, "");

      const result = await createDocMutation({
        variables: {
          title,
          content: extractedText,
        },
        // Optionally refetch documents after creation
        refetchQueries: ["DocumentsByAuthor"],
      });

      if (!result.data) throw new Error("No data received from mutation");
      return result.data.createDoc;
    } catch (err: any) {
      const errorMessage = err.message || "An error occurred during upload";
      setError(errorMessage);

      // Handle specific error cases
      if (errorMessage.toLowerCase().includes("unauthorized")) {
        router.push("/auth/login");
      }

      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    uploadDocument,
    isLoading,
    error,
    status,
  };
};
