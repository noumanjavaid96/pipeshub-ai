import type { CSSProperties } from 'react';
import type { ScaledPosition, HighlightPosition } from 'react-pdf-highlighter'; // Assuming HighlightPosition is needed
import type {
  Comment,
  Content,
  Position,
  BoundingBox,
  HighlightType,
  HighlightPopupProps,
  // Assuming DocumentContent might be needed here or in a shared types file
} from 'src/types/pdf-highlighter';
// We might need DocumentContent if processHighlight stays here directly
import type { DocumentContent } from 'src/sections/knowledgebase/types/search-response';

import React, { useEffect } from 'react';
import { Highlight, AreaHighlight, Popup } from 'react-pdf-highlighter'; // Added Popup

// 1. HighlightPopup Component
export const HighlightPopupComponent: React.FC<HighlightPopupProps> = ({ comment }) =>
  comment?.text ? (
    <div className="Highlight__popup">
      {comment.emoji} {comment.text}
    </div>
  ) : null;

// 2. processHighlight Function
// Consider if DocumentContent should be imported from a more central location if used elsewhere
export const processHighlightForCitation = (citation: DocumentContent): HighlightType | null => {
  try {
    const boundingBox: BoundingBox[] = citation.metadata?.bounding_box;

    if (!boundingBox || boundingBox.length !== 4) {
      console.warn('Invalid bounding box for citation:', citation);
      return null;
    }

    const PAGE_WIDTH = 967; // These might need to be configurable or passed as props
    const PAGE_HEIGHT = 747.2272727272727;

    const mainRect = {
      x1: boundingBox[0].x * PAGE_WIDTH,
      y1: boundingBox[0].y * PAGE_HEIGHT,
      x2: boundingBox[2].x * PAGE_WIDTH,
      y2: boundingBox[2].y * PAGE_HEIGHT,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      pageNumber: citation.metadata?.pageNum[0] || 1,
    };

    return {
      content: {
        text: citation.content || '',
      },
      position: {
        boundingRect: mainRect,
        rects: [mainRect],
        pageNumber: mainRect.pageNumber,
      },
      comment: {
        text: '', // Default comment, can be extended
        emoji: '',
      },
      id: citation.metadata._id || String(Math.random()).slice(2), // Ensure unique ID
    };
  } catch (error) {
    console.error('Error processing citation highlight:', error);
    return null;
  }
};

// 3. CSS Style Injection (as a hook for a component that uses these styles)
export const useCitationHighlightStyles = () => {
  useEffect(() => {
    const styleId = 'citation-highlight-styles';
    if (document.getElementById(styleId)) {
      return; // Style already injected
    }
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .Highlight__part {
        cursor: pointer;
        position: absolute;
        background: rgba(0, 226, 143, 0.2); /* Default highlight color */
        transition: background 0.3s;
      }

      .Highlight--scrolledTo .Highlight__part {
        background: rgba(0, 226, 143, 0.4); /* Active highlight color */
        position: relative; /* Ensure z-index works if needed */
      }

      .Highlight--scrolledTo .Highlight__part::before {
        content: '[';
        position: absolute;
        top: 0;
        left: -8px;
        height: 100%;
        color: #006400; /* Dark green, consider making this themable */
        font-size: 20px;
        font-weight: bold;
        display: flex;
        align-items: center;
      }

      .Highlight--scrolledTo .Highlight__part::after {
        content: ']';
        position: absolute;
        top: 0;
        right: -8px;
        height: 100%;
        color: #006400; /* Dark green */
        font-size: 20px;
        font-weight: bold;
        display: flex;
        align-items: center;
      }

      /* Styles for the highlight-wrapper div */
      .highlight-wrapper {
        /* Uses CSS variables for dynamic coloring */
        background-color: var(--highlight-color, rgba(0, 226, 143, 0.2));
        opacity: var(--highlight-opacity, 0.4);
      }
    `;
    document.head.appendChild(style);
    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        document.head.removeChild(existingStyle);
      }
    };
  }, []);
};

// 4. CitationHighlightRenderer Component (encapsulating highlightTransform logic)
interface CitationHighlightRendererProps {
  highlight: HighlightType;
  isCurrentlyHighlighted: boolean; // Explicit prop to control highlighting state
  // Props needed by react-pdf-highlighter's Highlight/AreaHighlight if not passed directly
  // For example, if updateHighlight or screenshot functionality is needed here, pass them as props
  // For simplicity, this example assumes they are handled by the parent PdfHighlighter component
  setTip: (highlight: HighlightType, callback: () => JSX.Element) => void;
  hideTip: () => void;
  // Removed viewportToScaled and screenshot as they are part of PdfHighlighter context
  // updateHighlight: (highlightId: string, position: Partial<Position>, content: Partial<Content>) => void;
}

export const CitationHighlightRenderer: React.FC<CitationHighlightRendererProps> = ({
  highlight,
  isCurrentlyHighlighted,
  setTip,
  hideTip,
  // updateHighlight
}) => {
  const isTextHighlight = !highlight.content?.image;

  // Apply custom styling for the wrapper based on highlight state
  const wrapperStyle: CSSProperties = {
    // Directly use isCurrentlyHighlighted to set CSS variables
    '--highlight-color': isCurrentlyHighlighted ? 'rgba(76, 175, 80, 0.6)' : 'rgba(230, 244, 241, 0.4)', // Green when active, lighter otherwise
    '--highlight-opacity': '1', // Opacity is handled by background color's alpha
  } as CSSProperties;


  const componentToRender = isTextHighlight ? (
    <div
      className="highlight-wrapper" // Apply general styling via class
      style={wrapperStyle} // Apply dynamic styling via style prop
    >
      <Highlight
        isScrolledTo={isCurrentlyHighlighted} // This prop controls .Highlight--scrolledTo class
        position={highlight.position}
        comment={highlight.comment}
      />
    </div>
  ) : (
    <AreaHighlight
      isScrolledTo={isCurrentlyHighlighted}
      highlight={highlight}
      onChange={(boundingRect) => {
        // This logic might need to be passed in if `updateHighlight` is used from the parent
        // For now, assuming it's handled by the main PdfHighlighter or not needed for pure rendering
        console.log("AreaHighlight onChange:", boundingRect);
        // updateHighlight(highlight.id, { boundingRect }, {});
      }}
    />
  );

  return (
    <Popup
      popupContent={<HighlightPopupComponent {...highlight} />} // Use the extracted popup
      onMouseOver={(popupContent) => setTip(highlight, () => popupContent)}
      onMouseOut={hideTip}
      // key is usually provided by the parent mapping over highlights
    >
      {componentToRender}
    </Popup>
  );
};

// Optional: A wrapper component that includes the style hook
export const StyledCitationHighlightRenderer: React.FC<CitationHighlightRendererProps> = (props) => {
  useCitationHighlightStyles(); // Apply styles when this component is used
  return <CitationHighlightRenderer {...props} />;
};
