// components/VoiceSelector.tsx

import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface VoiceSelectorProps {
  voice: string;
  voices: string[];
  onChange: (voice: string) => void;
}

const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  voice,
  voices,
  onChange,
}) => {
  return (
    <div className="flex items-center gap-4">
      <label htmlFor="voiceSelect" className="text-lg min-w-[100px]">
        Voice:
      </label>
      <Select value={voice} onValueChange={onChange}>
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
    </div>
  );
};

export default VoiceSelector;
