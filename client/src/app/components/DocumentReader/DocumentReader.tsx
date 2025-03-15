// components/DocumentReader.tsx

"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <Card className="max-w-4xl mx-auto my-10">
        <CardContent className="flex justify-center items-center h-40">
          <div className="text-lg">Loading document...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-4xl mx-auto my-4">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold text-center">
          📖 Document Reader 🎤
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {text ? (
          <>
            <DocumentContent
              paragraphs={paragraphs}
              currentParagraphIndex={currentParagraphIndex}
              wordWindow={wordWindow}
              windowStart={windowStart}
              currentWordIndex={currentWordIndex}
            />
            <div className="mt-5 flex flex-col gap-4">
              <VoiceSelector
                voice={voice}
                voices={voices}
                onChange={setVoice}
              />
              <SpeedSlider speed={speed} onChange={setSpeed} />
              <PlaybackControls
                isPlaying={isPlaying}
                onPlay={handlePlay}
                onStop={handleStop}
              />
            </div>
          </>
        ) : (
          <div className="text-center p-8">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>No document content available.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentReader;
