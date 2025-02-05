// Dashboard.js
"use client";

import React, { useState } from "react";
import { Sidebar } from "./SideBar";
import { TopBar } from "./TopBar";
import { FileCard } from "./FileCard";
import { AudioControls } from "./AudioControls";

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentFile, setCurrentFile] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const files = [
    { id: 1, name: "Document 1.pdf", progress: 30 },
    { id: 2, name: "Meeting Notes.docx", progress: 75 },
    { id: 3, name: "Article.txt", progress: 50 },
  ];

  const handlePlay = (file) => {
    setCurrentFile(file);
    setIsPlaying(true);
  };

  const togglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar isOpen={sidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar onToggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          <h1 className="text-2xl font-semibold mb-6">Your Library</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {files.map((file) => (
              <FileCard key={file.id} file={file} onPlay={handlePlay} />
            ))}
          </div>
        </main>
        {currentFile && (
          <AudioControls
            currentFile={currentFile}
            isPlaying={isPlaying}
            onTogglePlay={togglePlay}
          />
        )}
      </div>
    </div>
  );
}
