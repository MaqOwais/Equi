/**
 * journal-blocks.ts — Extract plain text from journal block data.
 *
 * Journal entries are stored as block arrays in the `blocks` column.
 * Handles all storage formats so calendar/day views never show raw metadata.
 */

export interface JournalBlock {
  type: string;
  text?: string;    // journal editor format (local storage)
  content?: string; // Supabase/legacy format
  checked?: boolean;
}

/**
 * Convert journal blocks (any storage format) to a plain text string.
 *
 * Handles:
 * - JS array of block objects      (SQLite: JSON_COLS auto-deserializes)
 * - JSON string of block array     (Supabase raw response)
 * - `__blk__:` prefixed string     (journal editor serialization format)
 * - Plain string                   (fallback / legacy)
 * - null / undefined / other       (returns '')
 */
export function blocksToPlainText(raw: unknown): string {
  if (Array.isArray(raw)) {
    return (raw as JournalBlock[])
      .map((b) => b.text ?? b.content ?? '')
      .filter(Boolean)
      .join('\n');
  }

  if (typeof raw === 'string') {
    const s = raw.startsWith('__blk__:') ? raw.slice(8) : raw;
    try {
      const parsed: unknown = JSON.parse(s);
      if (Array.isArray(parsed)) {
        return (parsed as JournalBlock[])
          .map((b) => b.text ?? b.content ?? '')
          .filter(Boolean)
          .join('\n');
      }
    } catch {
      // Not JSON — it's plain text already
    }
    return s;
  }

  return '';
}

/** Returns true if raw journal data has any actual text content. */
export function hasJournalContent(raw: unknown): boolean {
  return blocksToPlainText(raw).trim().length > 0;
}
