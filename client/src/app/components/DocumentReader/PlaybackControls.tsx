// components/PlaybackControls.tsx

import React from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw } from "lucide-react";

interface PlaybackControlsProps {
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
}

const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  onPlay,
  onStop,
}) => {
  return (
    <div className="flex justify-center gap-4">
      <Button
        onClick={isPlaying ? onStop : onPlay}
        className="flex items-center gap-2"
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        {isPlaying ? "Stop" : "Play"}
      </Button>
      <Button
        onClick={onStop}
        disabled={!isPlaying}
        className="flex items-center gap-2"
      >
        <RotateCcw size={16} />
        Reset
      </Button>
    </div>
  );
};

export default PlaybackControls;
