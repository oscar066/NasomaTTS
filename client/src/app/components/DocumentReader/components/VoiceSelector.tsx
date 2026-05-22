import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Voice } from "@/lib/api";

interface VoiceSelectorProps {
  voice: string;
  voices: Voice[];
  onChange: (voice: string) => void;
}

const VoiceSelector: React.FC<VoiceSelectorProps> = ({ voice, voices, onChange }) => {
  return (
    <div className="flex items-center gap-3">
      <label htmlFor="voiceSelect" className="text-sm font-medium text-foreground min-w-[60px]">
        Voice
      </label>
      <Select value={voice} onValueChange={onChange}>
        <SelectTrigger id="voiceSelect" className="w-48">
          <SelectValue placeholder="Select a voice" />
        </SelectTrigger>
        <SelectContent>
          {voices.map((v) => (
            <SelectItem key={v.id} value={v.id}>
              {v.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default VoiceSelector;
