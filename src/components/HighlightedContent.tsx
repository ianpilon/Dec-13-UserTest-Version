import React from 'react';

interface HighlightedContentProps {
  content: string;
}

export const HighlightedContent: React.FC<HighlightedContentProps> = ({ content }) => {
  if (!content) return null;

  const processLine = (line: string) => {
    // Match lines that start with a word/phrase followed by a colon
    const match = line.match(/^([^:]+):(.*)/);
    if (match) {
      const [_, title, rest] = match;
      return (
        <>
          <span className="marker-highlight">{title}:</span>
          {rest}
        </>
      );
    }
    return line;
  };

  return (
    <div className="whitespace-pre-wrap font-typewriter content-text">
      {content.split('\n').map((line, i) => (
        <div key={i}>{processLine(line)}</div>
      ))}
    </div>
  );
};
