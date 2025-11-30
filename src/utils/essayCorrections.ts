/**
 * Essay Corrections Utility
 * Renders essay text with yellow highlights for corrections
 */

export interface EssayCorrection {
  id: string;
  essay_id: string;
  start_index: number;
  end_index: number;
  original_text: string;
  corrected_text: string;
  teacher_note: string | null;
  created_by: string;
  created_at: string;
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
 * Renders essay text with yellow highlights for corrections
 * Corrections are applied from end to start to avoid index shifting
 */
export function renderEssayWithCorrections(
  originalText: string,
  corrections: EssayCorrection[]
): string {
  if (!originalText) return '';
  if (!corrections || corrections.length === 0) {
    return escapeHtml(originalText);
  }

  // Sort corrections by start_index descending (apply from end to start)
  const sortedCorrections = [...corrections].sort((a, b) => {
    if (b.start_index !== a.start_index) {
      return b.start_index - a.start_index;
    }
    return b.end_index - a.end_index;
  });

  let result = originalText;

  // Apply corrections from end to start
  for (const correction of sortedCorrections) {
    const before = result.slice(0, correction.start_index);
    const original = result.slice(correction.start_index, correction.end_index);
    const after = result.slice(correction.end_index);

    // Build tooltip text (plain text for title attribute)
    let tooltipText = `Correct: ${correction.corrected_text}`;
    if (correction.teacher_note) {
      tooltipText += `\n\nAdvice: ${correction.teacher_note}`;
    }

    // Escape for HTML attribute
    const escapedTooltip = tooltipText.replace(/"/g, '&quot;').replace(/\n/g, ' ');

    // Wrap original text with highlight and tooltip
    // Add data attributes for easy access in click handler
    const highlighted = `<span class="essay-correction" data-correction-id="${correction.id}" data-corrected="${escapeHtml(correction.corrected_text)}" data-original="${escapeHtml(original)}" data-note="${correction.teacher_note ? escapeHtml(correction.teacher_note) : ''}" title="Click to see correction details">${escapeHtml(original)}</span>`;

    result = before + highlighted + after;
  }

  return result;
}

