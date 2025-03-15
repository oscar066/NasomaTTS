import React from "react";

interface NasomaLogoProps {
  size?: "sm" | "md" | "lg";
  showPulse?: boolean;
}

const NasomaLogo: React.FC<NasomaLogoProps> = ({ 
  size = "md",
  showPulse = true 
}) => {
  const sizes = {
    sm: "h-7 w-7",
    md: "h-10 w-10",
    lg: "h-12 w-12"
  };

  const textSizes = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-3xl"
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`${sizes[size]} text-primary group-hover:scale-110 transition-transform duration-300`}
        >
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" x2="12" y1="19" y2="22" />
        </svg>
        {showPulse && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
        )}
      </div>
      <span className={`${textSizes[size]} font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent`}>
        Nasoma
      </span>
    </div>
  );
};

export default NasomaLogo;