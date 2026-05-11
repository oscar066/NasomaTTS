"use client";

import React from "react";

interface PDFViewerProps {
  url: string;
  bottomOffset?: number;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ url, bottomOffset = 160 }) => {
  return (
    <iframe
      src={url}
      title="Document"
      className="w-full border-0 block bg-gray-100"
      style={{ height: `calc(100vh - 52px - ${bottomOffset}px)` }}
    />
  );
};

export default PDFViewer;
