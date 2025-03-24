import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Home, FileText, Upload, Cog, HelpCircle, Loader2 } from "lucide-react";
import NasomaLogo from "../Logo/nasoma-logo";
import { useDocumentUpload } from "@/hooks/useDocumentUpload";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function Sidebar({ isOpen }) {
  const fileInputRef = useRef(null);
  const { uploadDocument, isLoading } = useDocumentUpload();
  const router = useRouter();

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (event) => {
    if (event.target.files && event.target.files[0]) {
      try {
        const file = event.target.files[0];

        // Validate file is PDF
        if (file.type !== "application/pdf") {
          toast({
            title: "Invalid file type",
            description: "Please upload a PDF file",
            variant: "destructive",
          });
          return;
        }

        // Upload document
        const result = await uploadDocument(file);

        // Show success message
        toast.success("Document uploaded successfully", {
          description: `${file.name} has been processed and saved`,
        });

        // Navigate to the document viewer if needed
        if (result && result.id) {
          router.push(`/documents/${result.id}`);
        }
      } catch (err) {
        // Use the caught error message directly instead of the state variable "error"
        toast.error("Upload failed", {
          description: err.message || "An error occurred during upload",
        });
      } finally {
        // Reset file input
        event.target.value = "";
      }
    }
  };

  return (
    <aside
      className={`
        bg-gray-100 w-64 min-h-screen transition-transform duration-300
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}
    >
      {/* Logo Section */}
      <div className="p-5 border-b border-gray-200">
        <NasomaLogo size="sm" showPulse={true} />
      </div>

      {/* Main Navigation */}
      <nav className="flex flex-col space-y-6 p-5">
        <Button
          variant="ghost"
          className="w-full justify-start hover:bg-blue-100 text-gray-700"
        >
          <Home className="mr-3 h-4 w-4" />
          Dashboard
        </Button>

        {/* Library Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-500 px-2">Library</h3>
          <Button
            variant="ghost"
            className="w-full justify-start hover:bg-blue-100 text-gray-700"
          >
            <FileText className="mr-3 h-4 w-4" />
            All Documents
          </Button>
        </div>

        {/* Upload Button */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="application/pdf"
        />
        <Button
          onClick={handleUploadClick}
          disabled={isLoading}
          className="w-full justify-start bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isLoading ? (
            <Loader2 className="mr-3 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-3 h-4 w-4" />
          )}
          {isLoading ? "Uploading..." : "Upload"}
        </Button>

        {/* Settings */}
        <Button
          variant="ghost"
          className="w-full justify-start hover:bg-blue-100 text-gray-700"
        >
          <Cog className="mr-3 h-4 w-4" />
          Settings
        </Button>

        {/* Plan Info */}
        <div className="p-4 bg-blue-50 rounded-lg space-y-2">
          <p className="text-sm font-medium text-blue-800">Free Plan</p>
          <Button
            variant="link"
            className="p-0 h-auto text-blue-600 hover:text-blue-700"
          >
            Upgrade
          </Button>
        </div>

        {/* Help & Support */}
        <Button
          variant="ghost"
          className="w-full justify-start hover:bg-blue-100 text-gray-700"
        >
          <HelpCircle className="mr-3 h-4 w-4" />
          Help & Support
        </Button>
      </nav>
    </aside>
  );
}
