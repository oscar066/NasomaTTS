// src/components/Dashboard/FileCard.jsx
import React from "react";
import Link from "next/link";
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
  return (
    <Link href={`/documents/${file.id}`} className="block">
      <div className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium">{file.name}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={() => alert("Rename functionality here")}
              >
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => alert("Share functionality here")}
              >
                Share
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => alert("Delete functionality here")}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Progress value={file.progress} className="mb-2" />
        <div className="flex justify-between items-center">
          <Button variant="outline" size="sm">
            <Play className="h-4 w-4 mr-2" />
            Play
          </Button>
          <span className="text-sm text-gray-500">
            {file.progress}% complete
          </span>
        </div>
      </div>
    </Link>
  );
}
