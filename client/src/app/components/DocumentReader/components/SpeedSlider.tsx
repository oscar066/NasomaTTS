import React from "react";
import { Slider } from "@/components/ui/slider";

interface SpeedSliderProps {
  speed: number;
  onChange: (speed: number) => void;
}

const SpeedSlider: React.FC<SpeedSliderProps> = ({ speed, onChange }) => {
  return (
    <div className="flex items-center gap-3">
      <label htmlFor="speedSlider" className="text-sm font-medium text-foreground min-w-[60px]">
        Speed
      </label>
      <Slider
        id="speedSlider"
        min={0.5}
        max={3}
        step={0.25}
        value={[speed]}
        onValueChange={(value) => onChange(value[0])}
        className="w-48"
      />
      <span className="text-sm text-muted-foreground font-mono w-10">
        {speed.toFixed(2)}×
      </span>
    </div>
  );
};

export default SpeedSlider;
