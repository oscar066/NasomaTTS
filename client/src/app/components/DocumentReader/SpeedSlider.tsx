// components/SpeedSlider.tsx

import React from "react";
import { Slider } from "@/components/ui/slider";

interface SpeedSliderProps {
  speed: number;
  onChange: (speed: number) => void;
}

const SpeedSlider: React.FC<SpeedSliderProps> = ({ speed, onChange }) => {
  return (
    <div className="flex items-center gap-4">
      <label htmlFor="speedSlider" className="text-lg min-w-[100px]">
        Speed:
      </label>
      <Slider
        id="speedSlider"
        min={0.5}
        max={2}
        step={0.1}
        value={[speed]}
        onValueChange={(value) => onChange(value[0])}
        className="w-[180px]"
      />
      <span>{speed.toFixed(1)}x</span>
    </div>
  );
};

export default SpeedSlider;
