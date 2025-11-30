/**
 * Simple Essay Review Component
 * Teachers select text → popover appears → save correction
 */

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { X, Edit2, Trash2 } from 'lucide-react';
import { EssayCorrection, renderEssayWithCorrections } from '@/utils/essayCorrections';

interface SimpleEssayReviewProps {
  originalText: string;
  corrections: EssayCorrection[];
  onAddCorrection: (startIndex: number, endIndex: number, originalText: string, correctedText: string, note?: string) => void;
  onEditCorrection: (id: string, correctedText: string, note?: string) => void;
  onDeleteCorrection: (id: string) => void;
}

export function SimpleEssayReview({
  originalText,
  corrections,
  onAddCorrection,
  onEditCorrection,
  onDeleteCorrection,
}: SimpleEssayReviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<{
    start: number;
    end: number;
    text: string;
    x: number;
    y: number;
  } | null>(null);
  const [editingCorrection, setEditingCorrection] = useState<EssayCorrection | null>(null);
  const [correctedText, setCorrectedText] = useState('');
  const [teacherNote, setTeacherNote] = useState('');

  // Render essay with yellow highlights
  const renderedHtml = renderEssayWithCorrections(originalText, corrections);

  // Handle text selection (works for both click and drag)
  const handleMouseUp = () => {
    // Small delay to ensure selection is complete (especially for drag)
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      if (range.collapsed) return; // No selection

      const selectedText = selection.toString().trim();
      if (!selectedText) return;

      const container = containerRef.current;
      if (!container) return;

      // Check if selection is within our container
      if (!container.contains(range.commonAncestorContainer)) {
        return; // Selection is outside our container
      }

      // Method 1: Use Range to calculate text position in container
      // This works even with HTML tags in the rendered content
      try {
        const beforeRange = document.createRange();
        beforeRange.selectNodeContents(container);
        beforeRange.setEnd(range.startContainer, range.startOffset);
        const textBefore = beforeRange.toString();

        const afterRange = document.createRange();
        afterRange.selectNodeContents(container);
        afterRange.setStart(range.endContainer, range.endOffset);
        const textAfter = afterRange.toString();

        // Calculate indices based on text position
        const startIndex = textBefore.length;
        const endIndex = originalText.length - textAfter.length;

        // Verify the selected text matches what's at these indices in original
        const actualSelectedText = originalText.slice(startIndex, endIndex).trim();
        
        // If the text doesn't match exactly, try to find it
        if (actualSelectedText !== selectedText.trim()) {
          // Fallback: search for the text in original
          const foundIndex = originalText.indexOf(selectedText);
          if (foundIndex !== -1) {
            const rect = range.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            
            setSelection({
              start: foundIndex,
              end: foundIndex + selectedText.length,
              text: selectedText,
              x: rect.left - containerRect.left + rect.width / 2,
              y: rect.top - containerRect.top - 10,
            });
            setCorrectedText('');
            setTeacherNote('');
            return;
          }
          // If still not found, use calculated indices anyway
        }

        // Ensure indices are within bounds
        const safeStartIndex = Math.max(0, Math.min(startIndex, originalText.length));
        const safeEndIndex = Math.max(safeStartIndex, Math.min(endIndex, originalText.length));

        // Get position for popover
        const rect = range.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        setSelection({
          start: safeStartIndex,
          end: safeEndIndex,
          text: selectedText,
          x: rect.left - containerRect.left + rect.width / 2,
          y: rect.top - containerRect.top - 10,
        });

        setCorrectedText(''); // Start fresh
        setTeacherNote('');
      } catch (error) {
        console.error('Error calculating selection indices:', error);
        // Fallback: try simple indexOf
        const foundIndex = originalText.indexOf(selectedText);
        if (foundIndex !== -1) {
          const rect = range.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          
          setSelection({
            start: foundIndex,
            end: foundIndex + selectedText.length,
            text: selectedText,
            x: rect.left - containerRect.left + rect.width / 2,
            y: rect.top - containerRect.top - 10,
          });
          setCorrectedText('');
          setTeacherNote('');
        }
      }
    }, 50); // Slightly longer delay for drag operations
  };

  // Handle click on existing correction
  useEffect(() => {
    const handleCorrectionClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const correctionSpan = target.closest('.essay-correction');
      if (correctionSpan) {
        const correctionId = correctionSpan.getAttribute('data-correction-id');
        if (correctionId) {
          const correction = corrections.find(c => c.id === correctionId);
          if (correction) {
            e.preventDefault();
            e.stopPropagation();
            setEditingCorrection(correction);
            setCorrectedText(correction.corrected_text);
            setTeacherNote(correction.teacher_note || '');
            setSelection(null);
          }
        }
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('click', handleCorrectionClick);
      return () => {
        container.removeEventListener('click', handleCorrectionClick);
      };
    }
  }, [corrections]);

  // Save new correction
  const handleSaveCorrection = () => {
    if (!selection) return;

    onAddCorrection(
      selection.start,
      selection.end,
      selection.text,
      correctedText.trim(),
      teacherNote.trim() || undefined
    );
    setSelection(null);
    setCorrectedText('');
    setTeacherNote('');
    window.getSelection()?.removeAllRanges();
  };

  // Save edited correction
  const handleSaveEditedCorrection = () => {
    if (!editingCorrection) return;

    onEditCorrection(
      editingCorrection.id,
      correctedText.trim(),
      teacherNote.trim() || undefined
    );
    setEditingCorrection(null);
    setCorrectedText('');
    setTeacherNote('');
  };

  // Delete correction
  const handleDeleteCorrection = () => {
    if (!editingCorrection) return;

    onDeleteCorrection(editingCorrection.id);
    setEditingCorrection(null);
    setCorrectedText('');
    setTeacherNote('');
  };

  // Cancel
  const handleCancel = () => {
    setSelection(null);
    setEditingCorrection(null);
    setCorrectedText('');
    setTeacherNote('');
    window.getSelection()?.removeAllRanges();
  };

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="min-h-[400px] p-4 border rounded-lg bg-white dark:bg-gray-900 prose prose-sm max-w-none dark:prose-invert"
        onMouseUp={handleMouseUp}
        onMouseDown={(e) => {
          // Clear any existing selection popover when starting new selection
          if (e.detail === 1) { // Single click, not double click
            // Don't clear on double click as it might interfere
          }
        }}
        style={{ userSelect: 'text', cursor: 'text', WebkitUserSelect: 'text' }}
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
      />

      {/* Popover for new correction */}
      {selection && (
        <div
          className="absolute z-50 bg-white dark:bg-gray-800 border rounded-lg shadow-lg p-4 min-w-[300px] max-w-[400px]"
          style={{
            left: `${selection.x}px`,
            top: `${selection.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Add Correction</h4>
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div>
              <Label htmlFor="original-text" className="text-xs">
                Selected Text (Read Only)
              </Label>
              <Input
                id="original-text"
                value={selection.text}
                readOnly
                className="mt-1 bg-muted"
              />
            </div>

            <div>
              <Label htmlFor="corrected-text" className="text-xs">
                Corrected Text <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="corrected-text"
                value={correctedText}
                onChange={(e) => setCorrectedText(e.target.value)}
                placeholder="Enter the corrected version..."
                className="mt-1 min-h-[80px]"
                required
              />
            </div>

            <div>
              <Label htmlFor="teacher-note" className="text-xs">
                Short Advice (Optional)
              </Label>
              <Input
                id="teacher-note"
                value={teacherNote}
                onChange={(e) => setTeacherNote(e.target.value)}
                placeholder="e.g., Better grammar, Wrong tense..."
                className="mt-1"
              />
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSaveCorrection}
                className="flex-1"
                disabled={!correctedText.trim()}
              >
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Popover for editing existing correction */}
      {editingCorrection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 border rounded-lg shadow-lg p-6 min-w-[400px] max-w-[500px]">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-lg">Edit Correction</h4>
                <Button variant="ghost" size="sm" onClick={handleCancel}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div>
                <Label htmlFor="edit-original" className="text-sm">
                  Original Text (Read Only)
                </Label>
                <Input
                  id="edit-original"
                  value={editingCorrection.original_text}
                  readOnly
                  className="mt-1 bg-muted"
                />
              </div>

              <div>
                <Label htmlFor="edit-corrected" className="text-sm">
                  Corrected Text <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="edit-corrected"
                  value={correctedText}
                  onChange={(e) => setCorrectedText(e.target.value)}
                  placeholder="Enter the corrected version..."
                  className="mt-1 min-h-[100px]"
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-note" className="text-sm">
                  Short Advice (Optional)
                </Label>
                <Input
                  id="edit-note"
                  value={teacherNote}
                  onChange={(e) => setTeacherNote(e.target.value)}
                  placeholder="e.g., Better grammar, Wrong tense..."
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSaveEditedCorrection}
                  className="flex-1"
                  disabled={!correctedText.trim()}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Update
                </Button>
                <Button variant="destructive" onClick={handleDeleteCorrection}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

