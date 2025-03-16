import { useState } from "react";
import axios from "axios";
import { useMutation } from "@apollo/client";
import { gql } from "@apollo/client";

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize the mutation
  const [createDocMutation] = useMutation(CREATE_DOC);

  interface UploadResponse {
    data: {
      content: string;
    };
  }

  type CreateDocData = {
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
  };

  interface CreateDocResponse {
    data?: CreateDocData;
  }

  const uploadDocument = async (
    file: File
  ): Promise<CreateDocData["createDoc"]> => {
    if (!file) throw new Error("No file provided");

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
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      const extractedText: string = response.data.content;

      // Generate a title from the filename
      const title: string = file.name.replace(/\.[^/.]+$/, ""); // Remove extension

      // Then save to database using GraphQL mutation
      const result: CreateDocResponse = await createDocMutation({
        variables: {
          title,
          content: extractedText,
        },
      });
      if (!result.data) throw new Error("No data received from mutation");
      return result.data.createDoc;
    } catch (err: any) {
      setError(err.message || "An error occurred during upload");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    uploadDocument,
    isLoading,
    error,
  };
};
