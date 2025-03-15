"use client";

import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import DocumentContent from "./DocumentContent";
import VoiceSelector from "./VoiceSelector";
import SpeedSlider from "./SpeedSlider";
import PlaybackControls from "./PlaybackControls";
import { useDocumentReader } from "@/hooks/useDocumentReader";

const DocumentReader: React.FC = () => {
  const {
    state: {
      docName,
      text,
      paragraphs,
      currentParagraphIndex,
      currentWordIndex,
      wordWindow,
      windowStart,
      voice,
      voices,
      isPlaying,
      speed,
      loading,
      error,
    },
    setVoice,
    setSpeed,
    handlePlay,
    handleStop,
  } = useDocumentReader();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading document...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Sticky Navbar */}
      <header className="sticky top-0 bg-white shadow p-6 z-10">
        <h1 className="text-2xl font-bold text-center">
          {docName || "Untitled Document"}
        </h1>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 mx-auto max-w-4xl w-full p-4 pb-32">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {text ? (
          <DocumentContent
            paragraphs={paragraphs}
            currentParagraphIndex={currentParagraphIndex}
            wordWindow={wordWindow}
            windowStart={windowStart}
            currentWordIndex={currentWordIndex}
          />
        ) : (
          <div className="text-center p-8">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>No document content available.</p>
          </div>
        )}
      </main>

      {/* Floating Playback Controls */}
      <footer className="fixed bottom-0 left-0 right-0 flex justify-center z-10">
        <div className="bg-white rounded shadow px-6 py-4 flex flex-col gap-4 max-w-4xl w-full mx-4 mb-2">
          <div className="flex flex-col md:flex-row gap-4">
            <VoiceSelector voice={voice} voices={voices} onChange={setVoice} />
            <SpeedSlider speed={speed} onChange={setSpeed} />
          </div>
          <PlaybackControls
            isPlaying={isPlaying}
            onPlay={handlePlay}
            onStop={handleStop}
          />
        </div>
      </footer>
    </div>
  );
};

export default DocumentReader;
