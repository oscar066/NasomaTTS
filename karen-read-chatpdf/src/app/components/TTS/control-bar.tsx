import type React from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, Pause, RotateCcw } from "lucide-react";

interface ControlBarProps {
  voice: string;
  setVoice: (voice: string) => void;
  voices: string[];
  speed: number;
  setSpeed: (speed: number) => void;
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
}

const ControlBar: React.FC<ControlBarProps> = ({
  voice,
  setVoice,
  voices,
  speed,
  setSpeed,
  isPlaying,
  onPlay,
  onStop,
}) => {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-100 border-t border-gray-200">
      <div className="flex items-center gap-4">
        <Select value={voice} onValueChange={setVoice}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select a voice" />
          </SelectTrigger>
          <SelectContent>
            {voices.map((v) => (
              <SelectItem key={v} value={v}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Speed:</span>
          <Slider
            min={0.5}
            max={2}
            step={0.1}
            value={[speed]}
            onValueChange={(value) => setSpeed(value[0])}
            className="w-[100px]"
          />
          <span className="text-sm font-medium">{speed.toFixed(1)}x</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          onClick={isPlaying ? onStop : onPlay}
          className="flex items-center gap-2"
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          {isPlaying ? "Stop" : "Play"}
        </Button>
        <Button onClick={onStop} className="flex items-center gap-2">
          <RotateCcw size={16} />
          Reset
        </Button>
      </div>
    </div>
  );
};

export default ControlBar;
