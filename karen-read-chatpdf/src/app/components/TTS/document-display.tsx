import type React from "react";

interface DocumentDisplayProps {
  paragraphs: string[];
  currentParagraphIndex: number;
  currentWordIndex: number;
  wordWindow: string[];
  windowStart: number;
}

const DocumentDisplay: React.FC<DocumentDisplayProps> = ({
  paragraphs,
  currentParagraphIndex,
  currentWordIndex,
  wordWindow,
  windowStart,
}) => {
  return (
    <div className="flex-grow overflow-y-auto p-4 bg-white">
      {paragraphs.map((para, index) => (
        <div
          key={index}
          className={`relative my-4 p-2 leading-relaxed text-lg ${
            index === currentParagraphIndex
              ? "bg-blue-100 rounded transition-colors duration-300"
              : ""
          }`}
        >
          <p className="m-0">{para}</p>
          {index === currentParagraphIndex && wordWindow.length > 0 && (
            <div className="mt-2 text-xl text-gray-800 bg-gray-200 p-2 rounded inline-block">
              {wordWindow.map((word, i) => {
                const globalIndex = windowStart + i;
                return (
                  <span
                    key={i}
                    className={
                      globalIndex === currentWordIndex
                        ? "bg-yellow-300 font-bold"
                        : ""
                    }
                  >
                    {word}{" "}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default DocumentDisplay;
