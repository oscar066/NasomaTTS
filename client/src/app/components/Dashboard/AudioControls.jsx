// AudioControls.js
import React from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, Mic } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

export function AudioControls({ currentFile, isPlaying, onTogglePlay }) {
  return (
    <footer className="bg-white border-t p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            className="mr-2"
            onClick={onTogglePlay}
          >
            {isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6" />
            )}
          </Button>
          <div>
            <p className="font-medium">{currentFile.name}</p>
            <Progress value={currentFile.progress} className="w-64" />
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Select defaultValue="natural">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select a voice" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="natural">Natural Voice</SelectItem>
              <SelectItem value="robotic">Robotic Voice</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center">
            <Mic className="h-5 w-5 mr-2" />
            <Slider defaultValue={[50]} max={100} step={1} className="w-32" />
          </div>
        </div>
      </div>
    </footer>
  );
}
