// Sidebar.js
import React from "react";
import { Button } from "@/components/ui/button";
import { Home, FileText, Upload, Cog, HelpCircle } from "lucide-react";

export function Sidebar({ isOpen }) {
  if (!isOpen) return null; // Optionally, you might animate this instead of conditionally rendering.

  return (
    <aside className="bg-white w-64 min-h-screen p-4">
      <nav className="space-y-6">
        <Button variant="ghost" className="w-full justify-start">
          <Home className="mr-2 h-4 w-4" />
          Home
        </Button>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-500">Library</h3>
          <Button variant="ghost" className="w-full justify-start">
            <FileText className="mr-2 h-4 w-4" />
            All Documents
          </Button>
        </div>
        <Button className="w-full">
          <Upload className="mr-2 h-4 w-4" />
          Upload
        </Button>
        <Button variant="ghost" className="w-full justify-start">
          <Cog className="mr-2 h-4 w-4" />
          Settings
        </Button>
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm font-medium text-blue-800">Free Plan</p>
          <Button variant="link" className="p-0 h-auto text-blue-600">
            Upgrade
          </Button>
        </div>
        <Button variant="ghost" className="w-full justify-start">
          <HelpCircle className="mr-2 h-4 w-4" />
          Help & Support
        </Button>
      </nav>
    </aside>
  );
}
