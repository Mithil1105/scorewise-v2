import { computeDiff, DiffSegment } from '@/utils/textDiff';

interface AssignmentDiffViewProps {
  currentText: string;
  originalText: string | null;
  label: string;
}

function renderDiffSegments(segments: DiffSegment[]) {
  return segments.map((segment, idx) => {
    if (segment.type === 'added') {
      return (
        <span key={idx} className="bg-green-500/20 text-green-700 dark:text-green-400 font-medium">
          {segment.text}
        </span>
      );
    } else if (segment.type === 'removed') {
      return (
        <span key={idx} className="line-through text-muted-foreground opacity-60">
          {segment.text}
        </span>
      );
    } else {
      return <span key={idx}>{segment.text}</span>;
    }
  });
}

export function AssignmentDiffView({ currentText, originalText, label }: AssignmentDiffViewProps) {
  // If no original text, just display current text normally
  if (!originalText || originalText === currentText) {
    return (
      <div>
        <p className="text-sm font-medium mb-1">{label}:</p>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{currentText}</p>
      </div>
    );
  }

  // Compute diff and render with change indicators
  const diffSegments = computeDiff(originalText, currentText);
  const hasChanges = diffSegments.some(seg => seg.type !== 'unchanged');

  return (
    <div>
      <p className="text-sm font-medium mb-1">
        {label}:
        {hasChanges && (
          <span className="ml-2 text-xs text-muted-foreground">
            (Updated - changes highlighted)
          </span>
        )}
      </p>
      <div className="text-sm text-muted-foreground whitespace-pre-wrap p-2 bg-muted/50 rounded border">
        {renderDiffSegments(diffSegments)}
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        <span className="inline-flex items-center gap-1">
          <span className="bg-green-500/20 text-green-700 dark:text-green-400 px-1 rounded">Added</span>
          <span className="line-through opacity-60">Removed</span>
        </span>
      </p>
    </div>
  );
}

