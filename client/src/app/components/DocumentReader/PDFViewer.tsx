"use client";

import React from "react";

interface PDFViewerProps {
  url: string;
  bottomOffset?: number;
}

const HEADER_HEIGHT = 56; // h-14

const PDFViewer: React.FC<PDFViewerProps> = ({ url, bottomOffset = 160 }) => {
  return (
    <iframe
      src={url}
      title="Document"
      className="w-full border-0 block bg-secondary/20"
      style={{ height: `calc(100vh - ${HEADER_HEIGHT}px - ${bottomOffset}px)` }}
    />
  );
};

export default PDFViewer;
