import { blocksToPlainText, hasJournalContent } from '../lib/journal-blocks';

describe('blocksToPlainText', () => {
  it('returns empty string for null', () => {
    expect(blocksToPlainText(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(blocksToPlainText(undefined)).toBe('');
  });

  it('returns empty string for number or boolean', () => {
    expect(blocksToPlainText(42)).toBe('');
    expect(blocksToPlainText(false)).toBe('');
  });

  it('extracts text from JS array of block objects (SQLite/Supabase format, content field)', () => {
    const blocks = [
      { type: 'paragraph', content: 'Hello world' },
      { type: 'paragraph', content: 'Second line' },
    ];
    expect(blocksToPlainText(blocks)).toBe('Hello world\nSecond line');
  });

  it('extracts text from JS array of block objects (journal editor format, text field)', () => {
    const blocks = [
      { type: 'p', text: 'Hello world' },
      { type: 'h1', text: 'A heading' },
      { type: 'bullet', text: 'A bullet' },
    ];
    expect(blocksToPlainText(blocks)).toBe('Hello world\nA heading\nA bullet');
  });

  it('prefers text over content when both are present', () => {
    const blocks = [{ type: 'p', text: 'from text', content: 'from content' }];
    expect(blocksToPlainText(blocks)).toBe('from text');
  });

  it('extracts text from __blk__ prefixed string with text field blocks (local storage format)', () => {
    const raw =
      '__blk__:' +
      JSON.stringify([
        { type: 'p', text: 'Good morning' },
        { type: 'bullet', text: 'Did my exercises' },
      ]);
    expect(blocksToPlainText(raw)).toBe('Good morning\nDid my exercises');
  });

  it('skips blocks with empty content', () => {
    const blocks = [
      { type: 'paragraph', content: 'Text' },
      { type: 'paragraph', content: '' },
      { type: 'heading', content: 'Title' },
    ];
    expect(blocksToPlainText(blocks)).toBe('Text\nTitle');
  });

  it('parses JSON string of block array (Supabase format)', () => {
    const json = JSON.stringify([
      { type: 'paragraph', content: 'From JSON string' },
    ]);
    expect(blocksToPlainText(json)).toBe('From JSON string');
  });

  it('strips __blk__: prefix and extracts plain text', () => {
    const raw =
      '__blk__:' +
      JSON.stringify([
        { type: 'paragraph', content: 'Good morning' },
        { type: 'bullet', content: 'Did my exercises' },
      ]);
    expect(blocksToPlainText(raw)).toBe('Good morning\nDid my exercises');
  });

  it('does NOT return raw JSON metadata — the core regression guard', () => {
    const raw = '__blk__:[{"type":"paragraph","content":"Real text"}]';
    const result = blocksToPlainText(raw);
    expect(result).not.toContain('"type"');
    expect(result).not.toContain('"paragraph"');
    expect(result).not.toContain('__blk__:');
    expect(result).not.toContain('{');
    expect(result).toBe('Real text');
  });

  it('returns plain string as-is if not JSON and no __blk__: prefix', () => {
    expect(blocksToPlainText('plain old text')).toBe('plain old text');
  });

  it('returns empty string for empty array', () => {
    expect(blocksToPlainText([])).toBe('');
  });

  it('handles checklist blocks', () => {
    const blocks = [
      { type: 'checklist', content: 'Take medication', checked: true },
      { type: 'checklist', content: 'Go for a walk', checked: false },
    ];
    expect(blocksToPlainText(blocks)).toBe('Take medication\nGo for a walk');
  });
});

describe('hasJournalContent', () => {
  it('returns false for null/undefined', () => {
    expect(hasJournalContent(null)).toBe(false);
    expect(hasJournalContent(undefined)).toBe(false);
  });

  it('returns false for empty array', () => {
    expect(hasJournalContent([])).toBe(false);
  });

  it('returns false for blocks with only whitespace content', () => {
    expect(hasJournalContent([{ type: 'paragraph', content: '   ' }])).toBe(false);
  });

  it('returns true when any block has real content', () => {
    expect(hasJournalContent([{ type: 'paragraph', content: 'Hello' }])).toBe(true);
  });

  it('returns true for __blk__ string with content', () => {
    const raw = '__blk__:' + JSON.stringify([{ type: 'paragraph', content: 'Hi' }]);
    expect(hasJournalContent(raw)).toBe(true);
  });
});
