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
    <div className="text-left mx-auto p-4 bg-background rounded overflow-y-auto">
      {paragraphs.map((para, index) => {
        const isActive = index === currentParagraphIndex;
        return (
          <div
            key={index}
            className={`relative my-4 p-3 leading-relaxed rounded-lg transition-colors duration-200 ${
              isActive ? "bg-primary/5 border-l-4 border-primary" : ""
            }`}
          >
            <p className="m-0 text-foreground">{para}</p>
            {isActive && wordWindow.length > 0 && (
              <div className="mt-2 text-sm text-foreground bg-secondary p-2 rounded inline-block">
                {wordWindow.map((word, i) => {
                  const globalIndex = windowStart + i;
                  return (
                    <span
                      key={i}
                      className={
                        globalIndex === currentWordIndex
                          ? "bg-primary/20 text-primary font-semibold rounded px-0.5"
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
        );
      })}
    </div>
  );
};

export default DocumentContent;
