import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, Play } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function FileCard({ file }) {
  const router = useRouter();

  // Function to truncate content and add ellipsis
  const truncateContent = (content, maxLength = 100) => {
    if (!content) return "";
    return content.length > maxLength
      ? `${content.substring(0, maxLength)}...`
      : content;
  };

  // Format date to be more readable
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handlePlayClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Store the document content in localStorage for quick access
    localStorage.setItem(
      "currentDocument",
      JSON.stringify({
        id: file.id,
        content: file.content,
        title: file.title,
      })
    );

    // Navigate to document reader with autoplay flag
    router.push(`/documents/${file.id}?autoplay=true`);
  };

  const handleCardClick = (e) => {
    e.preventDefault();
    router.push(`/documents/${file.id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition cursor-pointer"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium">{file.title}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => e.stopPropagation()}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                alert("Rename functionality here");
              }}
            >
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                alert("Share functionality here");
              }}
            >
              Share
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-600"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                alert("Delete functionality here");
              }}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content Preview Section */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 line-clamp-3">
          {truncateContent(file.content)}
        </p>
      </div>

      {/* Metadata Section */}
      <div className="flex justify-between items-center text-xs text-gray-500 mb-4">
        <span>By {file.author?.username || "Unknown"}</span>
        <span>{formatDate(file.createdAt)}</span>
      </div>

      <Progress value={file.progress || 0} className="mb-2" />
      <div className="flex justify-between items-center">
        <Button variant="outline" size="sm" onClick={handlePlayClick}>
          <Play className="h-4 w-4 mr-2" />
          Play
        </Button>
        <span className="text-sm text-gray-500">
          {file.progress || 0}% complete
        </span>
      </div>
    </div>
  );
}
