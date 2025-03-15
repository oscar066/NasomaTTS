// components/DocumentContent.tsx

import React from "react";

interface DocumentContentProps {
  paragraphs: string[];
  currentParagraphIndex: number;
  wordWindow: string[];
  windowStart: number;
  currentWordIndex: number;
}

const DocumentContent: React.FC<DocumentContentProps> = ({
  paragraphs,
  currentParagraphIndex,
  wordWindow,
  windowStart,
  currentWordIndex,
}) => {
  return (
    <div className="text-left mx-auto p-4 bg-gray-100 rounded overflow-y-auto">
      {paragraphs.map((para, index) => (
        <div
          key={index}
          className={`relative my-4 p-2 leading-relaxed ${
            index === currentParagraphIndex
              ? "bg-blue-100 rounded transition-colors duration-300"
              : ""
          }`}
        >
          <p className="m-0">{para}</p>
          {index === currentParagraphIndex && wordWindow.length > 0 && (
            <div className="mt-2 text-lg text-gray-800 bg-gray-200 p-2 rounded inline-block">
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

export default DocumentContent;
