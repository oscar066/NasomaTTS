"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircle,
  Volume2,
  Settings,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import NasomaLogo from "../Logo/nasoma-logo";
import DocumentContent from "./DocumentContent";
import VoiceSelector from "./VoiceSelector";
import SpeedSlider from "./SpeedSlider";
import PlaybackControls from "./PlaybackControls";
import { useDocumentReader } from "@/hooks/useDocumentReader";

const DocumentReader: React.FC = () => {
  const router = useRouter();
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

  const [controlsExpanded, setControlsExpanded] = React.useState(true);
  const totalParagraphs = paragraphs?.length || 0;
  const progress = totalParagraphs
    ? (currentParagraphIndex / totalParagraphs) * 100
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="mb-6">
          <NasomaLogo size="md" showPulse={true} />
        </div>
        <h2 className="text-xl font-medium mb-2">Loading document</h2>
        <Progress value={45} className="w-64" />
      </div>
    );
  }

  const toggleControls = () => {
    setControlsExpanded(!controlsExpanded);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Sticky Header */}
      <header className="sticky top-0 bg-white shadow-sm z-10">
        <div className="max-w-5xl mx-auto w-full px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="mr-2 -ml-2"
              onClick={() => router.push("/dashboard")}
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="sr-only">Back to Dashboard</span>
            </Button>

            <div className="flex items-center gap-2 group">
              <NasomaLogo size="sm" showPulse={true} />
              <span className="hidden md:inline text-gray-300 mx-2">|</span>
              <h1 className="text-xl font-semibold truncate hidden md:block">
                {docName || "Untitled Document"}
              </h1>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-1"
            onClick={toggleControls}
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Controls</span>
            {controlsExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
        </div>
        <Progress value={progress} className="h-1" />
      </header>

      {/* Mobile document title */}
      <div className="md:hidden bg-white px-4 py-2 border-b border-gray-100">
        <h2 className="text-lg font-medium text-gray-700 truncate">
          {docName || "Untitled Document"}
        </h2>
      </div>

      {/* Main Content */}
      <main className="flex-1 mx-auto max-w-5xl w-full p-4 pb-32">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
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
          <Card className="border border-dashed border-gray-300 bg-gray-50">
            <CardContent className="flex flex-col items-center justify-center p-12 text-gray-500">
              <AlertCircle className="h-10 w-10 mb-4" />
              <h3 className="text-lg font-medium mb-2">No document loaded</h3>
              <p className="text-center text-sm">
                Select a document to begin reading
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Floating Controls */}
      <footer
        className={`fixed bottom-0 left-0 right-0 flex justify-center z-10 transition-all duration-300 ${
          !controlsExpanded ? "translate-y-full" : ""
        }`}
      >
        <Card className="shadow-lg border-t border-gray-200 rounded-t-lg rounded-b-none max-w-5xl w-full mx-auto">
          <div className="absolute -top-8 left-0 right-0 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full h-8 w-8 p-0 shadow-md bg-white hover:bg-gray-100"
              onClick={toggleControls}
            >
              {controlsExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          </div>

          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 min-w-fit">
                <Volume2 className="h-4 w-4 text-gray-500" />
                <VoiceSelector
                  voice={voice}
                  voices={voices}
                  onChange={setVoice}
                />
              </div>

              <div className="flex-1 min-w-64">
                <SpeedSlider speed={speed} onChange={setSpeed} />
              </div>

              <div className="w-full sm:w-auto">
                <PlaybackControls
                  isPlaying={isPlaying}
                  onPlay={handlePlay}
                  onStop={handleStop}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </footer>
    </div>
  );
};

export default DocumentReader;
