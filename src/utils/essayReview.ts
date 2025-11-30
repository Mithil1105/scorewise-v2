/**
 * Essay Review System Utilities
 * Handles applying edits and rendering corrections
 */

export interface EssayEdit {
  id: string;
  essay_id: string;
  start_index: number;
  end_index: number;
  new_text: string;
  comment: string | null;
  created_by: string;
  created_at: string;
}

/**
 * Applies edits to original text to compute final corrected essay
 * Edits are applied in reverse order (descending by start_index) to avoid index shifts
 */
export function applyEditsToText(originalText: string, edits: EssayEdit[]): string {
  if (!originalText) return '';
  if (!edits || edits.length === 0) return originalText;

  // Sort edits by start_index descending to apply from end to beginning
  const sortedEdits = [...edits].sort((a, b) => {
    if (b.start_index !== a.start_index) {
      return b.start_index - a.start_index;
    }
    // If same start_index, sort by end_index descending
    return b.end_index - a.end_index;
  });

  let result = originalText;

  // Apply each edit from end to beginning
  for (const edit of sortedEdits) {
    const before = result.slice(0, edit.start_index);
    const after = result.slice(edit.end_index);
    result = before + edit.new_text + after;
  }

  return result;
}

/**
 * Renders text with visual corrections (red strikethrough for removed, green for added)
 * Returns HTML string with styled spans
 */
export function renderTextWithCorrections(originalText: string, edits: EssayEdit[]): string {
  if (!originalText) return '';
  if (!edits || edits.length === 0) {
    return escapeHtml(originalText);
  }

  // Sort edits by start_index ascending for rendering
  const sortedEdits = [...edits].sort((a, b) => {
    if (a.start_index !== b.start_index) {
      return a.start_index - b.start_index;
    }
    return a.end_index - b.end_index;
  });

  // Build segments array
  interface Segment {
    text: string;
    isRemoved: boolean;
    isAdded: boolean;
    comment: string | null;
  }

  const segments: Segment[] = [];
  let currentIndex = 0;

  for (const edit of sortedEdits) {
    // Add text before this edit
    if (edit.start_index > currentIndex) {
      const beforeText = originalText.slice(currentIndex, edit.start_index);
      if (beforeText) {
        segments.push({
          text: beforeText,
          isRemoved: false,
          isAdded: false,
          comment: null,
        });
      }
    }

    // Add removed text (if any)
    if (edit.end_index > edit.start_index) {
      const removedText = originalText.slice(edit.start_index, edit.end_index);
      if (removedText) {
        segments.push({
          text: removedText,
          isRemoved: true,
          isAdded: false,
          comment: null,
        });
      }
    }

    // Add new text (if any)
    if (edit.new_text) {
      segments.push({
        text: edit.new_text,
        isRemoved: false,
        isAdded: true,
        comment: edit.comment,
      });
    }

    currentIndex = Math.max(currentIndex, edit.end_index);
  }

  // Add remaining text after last edit
  if (currentIndex < originalText.length) {
    const remainingText = originalText.slice(currentIndex);
    if (remainingText) {
      segments.push({
        text: remainingText,
        isRemoved: false,
        isAdded: false,
        comment: null,
      });
    }
  }

  // Build HTML from segments
  const htmlParts: string[] = [];

  for (const segment of segments) {
    const escapedText = escapeHtml(segment.text);

    if (segment.isRemoved) {
      // Red strikethrough for removed text
      htmlParts.push(
        `<span style="color: #dc2626; text-decoration: line-through;">${escapedText}</span>`
      );
    } else if (segment.isAdded) {
      // Green text for added text
      if (segment.comment) {
        // Wrap with comment tooltip
        htmlParts.push(
          `<span class="edit-wrapper" style="position: relative; display: inline-block;">
            <span style="color: #16a34a; font-weight: 500;">${escapedText}</span>
            <span 
              class="edit-comment-icon" 
              style="color: #16a34a; margin-left: 4px; cursor: help; font-size: 0.9em; vertical-align: super;"
              title="Teacher: ${escapeHtml(segment.comment)}"
            >ℹ️</span>
          </span>`
        );
      } else {
        htmlParts.push(
          `<span style="color: #16a34a; font-weight: 500;">${escapedText}</span>`
        );
      }
    } else {
      // Regular text (unchanged)
      htmlParts.push(escapedText);
    }
  }

  return htmlParts.join('');
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Calculate character indices in original text from selection
 * This handles mapping from rendered HTML back to original text indices
 */
export function calculateIndicesFromSelection(
  originalText: string,
  selectionStart: number,
  selectionEnd: number,
  renderedHtml: string
): { startIndex: number; endIndex: number } {
  // For simplicity, we'll work with plain text indices
  // The selection should be made on a plain text representation
  // This is a simplified version - in production, you might need more sophisticated mapping
  
  // Strip HTML from rendered text to get plain text
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = renderedHtml;
  const plainText = tempDiv.textContent || tempDiv.innerText || '';

  // Map selection indices from rendered text to original text
  // This assumes the rendered text (with markup) has the same character positions
  // as the original text (which may not be true if edits are applied)
  
  // For now, return the selection as-is if it's within bounds
  const startIndex = Math.max(0, Math.min(selectionStart, originalText.length));
  const endIndex = Math.max(startIndex, Math.min(selectionEnd, originalText.length));

  return { startIndex, endIndex };
}

