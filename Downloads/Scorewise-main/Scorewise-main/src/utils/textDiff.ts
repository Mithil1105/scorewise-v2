/**
 * Text diff utility for showing changes in assignment edits
 * Computes diff segments - rendering is handled by components
 */

export interface DiffSegment {
  text: string;
  type: 'added' | 'removed' | 'unchanged';
}

/**
 * Simple word-by-word diff algorithm
 * Returns segments with their change type
 */
export function computeDiff(original: string, modified: string): DiffSegment[] {
  if (!original && !modified) return [];
  if (!original) return [{ text: modified, type: 'added' }];
  if (!modified) return [{ text: original, type: 'removed' }];
  if (original === modified) return [{ text: original, type: 'unchanged' }];

  const originalWords = original.split(/(\s+)/);
  const modifiedWords = modified.split(/(\s+)/);
  
  const segments: DiffSegment[] = [];
  let origIdx = 0;
  let modIdx = 0;

  while (origIdx < originalWords.length || modIdx < modifiedWords.length) {
    if (origIdx >= originalWords.length) {
      // Remaining words in modified are additions
      segments.push({ text: modifiedWords.slice(modIdx).join(''), type: 'added' });
      break;
    }
    
    if (modIdx >= modifiedWords.length) {
      // Remaining words in original are removals
      segments.push({ text: originalWords.slice(origIdx).join(''), type: 'removed' });
      break;
    }

    if (originalWords[origIdx] === modifiedWords[modIdx]) {
      // Words match, add as unchanged
      segments.push({ text: originalWords[origIdx], type: 'unchanged' });
      origIdx++;
      modIdx++;
    } else {
      // Words don't match - find next match or add as change
      const nextMatchOrig = findNextMatch(originalWords, origIdx, modifiedWords, modIdx);
      const nextMatchMod = findNextMatch(modifiedWords, modIdx, originalWords, origIdx);

      if (nextMatchOrig.distance <= nextMatchMod.distance && nextMatchOrig.distance < 10) {
        // Add removed words
        const removed = originalWords.slice(origIdx, nextMatchOrig.index).join('');
        if (removed.trim()) {
          segments.push({ text: removed, type: 'removed' });
        }
        origIdx = nextMatchOrig.index;
      } else if (nextMatchMod.distance < 10) {
        // Add added words
        const added = modifiedWords.slice(modIdx, nextMatchMod.index).join('');
        if (added.trim()) {
          segments.push({ text: added, type: 'added' });
        }
        modIdx = nextMatchMod.index;
      } else {
        // No good match found, treat as replacement
        const removed = originalWords[origIdx];
        const added = modifiedWords[modIdx];
        if (removed && removed.trim()) {
          segments.push({ text: removed, type: 'removed' });
        }
        if (added && added.trim()) {
          segments.push({ text: added, type: 'added' });
        }
        origIdx++;
        modIdx++;
      }
    }
  }

  return segments;
}

function findNextMatch(
  source: string[],
  startIdx: number,
  target: string[],
  targetStartIdx: number
): { index: number; distance: number } {
  for (let i = startIdx + 1; i < Math.min(startIdx + 10, source.length); i++) {
    for (let j = targetStartIdx; j < Math.min(targetStartIdx + 10, target.length); j++) {
      if (source[i] === target[j]) {
        return { index: i, distance: i - startIdx };
      }
    }
  }
  return { index: source.length, distance: Infinity };
}


