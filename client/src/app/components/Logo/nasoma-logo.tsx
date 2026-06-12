import React from "react";

interface NasomaLogoProps {
  size?: "sm" | "md" | "lg";
  showPulse?: boolean;
  showText?: boolean;
  /**
   * "default" — light backgrounds (gradient text)
   * "onDark"  — dark/gradient backgrounds (white text)
   */
  variant?: "default" | "onDark";
}

const NasomaLogo: React.FC<NasomaLogoProps> = ({
  size = "md",
  showPulse = false,
  showText = false,
  variant = "default",
}) => {
  const heights   = { sm: 40, md: 52, lg: 68 };
  const textSizes = { sm: "text-lg", md: "text-xl", lg: "text-2xl" };
  const h         = heights[size];

  return (
    <div className="relative inline-flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={variant === "onDark" ? "/Me-nasoma-tts-white.png" : "/Me-nasoma-tts.png"}
        alt="Me Nasoma"
        style={{ height: h, width: "auto" }}
      />

      {showText && (
        <span
          className={`${textSizes[size]} ${
            variant === "onDark"
              ? "text-white"
              : "bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent"
          }`}
        >
          <span className="font-extrabold tracking-tight">Me </span>
          <span className="font-bold tracking-tight">Nasoma</span>
        </span>
      )}

      {showPulse && (
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse" />
      )}
    </div>
  );
};

export default NasomaLogo;
