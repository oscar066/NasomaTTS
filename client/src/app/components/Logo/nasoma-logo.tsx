import React from "react";

interface NasomaLogoProps {
  size?: "sm" | "md" | "lg";
  showPulse?: boolean;
  showText?: boolean;
  /**
   * "default" — light backgrounds (mix-blend-mode: multiply removes white bg)
   * "onDark"  — dark/gradient backgrounds (logo wrapped in a glass pill)
   */
  variant?: "default" | "onDark";
}

const NasomaLogo: React.FC<NasomaLogoProps> = ({
  size = "md",
  showPulse = false,
  showText = false,
  variant = "default",
}) => {
  const heights     = { sm: 40, md: 52, lg: 68 };
  const textSizes   = { sm: "text-lg", md: "text-xl", lg: "text-2xl" };
  const h           = heights[size];

  const logoImg = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/Me-nasoma-tts.png"
      alt="Me-Nasoma"
      style={{
        height: h,
        width: "auto",
        // On light backgrounds the white bg blends away; colours stay vivid.
        mixBlendMode: variant === "default" ? "multiply" : undefined,
      }}
    />
  );

  return (
    <div className="relative inline-flex items-center gap-2">
      {variant === "onDark" ? (
        /* Glass pill so the logo's white background doesn't clash with the
           dark gradient — the logo colours are preserved inside. */
        <div className="bg-white/20 backdrop-blur-sm rounded-xl px-2 py-1 border border-white/25">
          {logoImg}
        </div>
      ) : (
        logoImg
      )}

      {showText && (
        <span
          className={`font-bold ${textSizes[size]} ${
            variant === "onDark"
              ? "text-white"
              : "bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent"
          }`}
        >
          Nasoma
        </span>
      )}

      {showPulse && (
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse" />
      )}
    </div>
  );
};

export default NasomaLogo;
