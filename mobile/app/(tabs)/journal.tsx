import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/auth';
import { useTodayStore } from '../../stores/today';
import { useJournalStore } from '../../stores/journal';
import { useAmbientTheme } from '../../stores/ambient';
import type { CycleState } from '../../types/database';

// ─── Types ────────────────────────────────────────────────────────────────────

type BlockType = 'p' | 'h1' | 'bullet' | 'quote' | 'checklist';

interface Block {
  id: string;
  type: BlockType;
  text: string;
  checked?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CYCLE_COLORS: Record<CycleState, string> = {
  stable: '#A8C5A0', manic: '#89B4CC', depressive: '#C4A0B0', mixed: '#C4A87A',
};
const CYCLE_LABELS: Record<CycleState, string> = {
  stable: 'Stable', manic: 'Elevated', depressive: 'Low', mixed: 'Mixed',
};

const CYCLE_PROMPTS: Record<CycleState, { title: string; icon: string; lines: string[] }> = {
  stable:     { title: 'A good day to reflect', icon: '🌿', lines: ['What went well today?', 'Who did you connect with?', 'What are you grateful for?'] },
  manic:      { title: 'Slow down for a moment', icon: '🌊', lines: ["What's racing through your mind?", 'What can you let go of today?', 'What would help you feel grounded?'] },
  depressive: { title: 'Even a few words is enough', icon: '🕯️', lines: ['How are you feeling in your body?', 'One small thing that happened today?', 'What do you need most right now?'] },
  mixed:      { title: 'Whatever you feel is valid', icon: '🌤️', lines: ['Describe your mood in three words.', "What's been hardest today?", 'What would make tomorrow easier?'] },
};

const BLOCK_TOOLS: { type: BlockType; icon: React.ComponentProps<typeof Ionicons>['name']; label: string }[] = [
  { type: 'p',         icon: 'text',              label: 'Text' },
  { type: 'h1',        icon: 'header',            label: 'Heading' },
  { type: 'bullet',    icon: 'list',              label: 'List' },
  { type: 'quote',     icon: 'chatbubble-outline', label: 'Quote' },
  { type: 'checklist', icon: 'checkbox-outline',  label: 'Task' },
];

// ─── Block serialisation ──────────────────────────────────────────────────────

const PREFIX = '__blk__:';

function blocksToString(blocks: Block[]): string {
  return PREFIX + JSON.stringify(blocks);
}

function stringToBlocks(str: string): Block[] {
  if (!str || str.trim() === '') return [makeBlock('p')];
  if (str.startsWith(PREFIX)) {
    try { return JSON.parse(str.slice(PREFIX.length)) as Block[]; } catch { /* fall through */ }
  }
  return [{ id: 'legacy', type: 'p', text: str }];
}

function makeBlock(type: BlockType = 'p', text = ''): Block {
  return { id: `b${Date.now()}${Math.random().toString(36).slice(2, 6)}`, type, text };
}

function totalWords(blocks: Block[]) {
  return blocks.map((b) => b.text.trim().split(/\s+/).filter(Boolean).length).reduce((a, b) => a + b, 0);
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function addDays(date: Date, days: number) {
  const d = new Date(date); d.setDate(d.getDate() + days); return d;
}
function toIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function formatBigDate(d: Date) {
  const key = toIso(d);
  if (key === toIso(new Date())) return 'Today';
  if (key === toIso(addDays(new Date(), -1))) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}
function formatSubDate(d: Date) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Block component ──────────────────────────────────────────────────────────

interface BlockProps {
  block: Block;
  accentColor: string;
  textPrimary: string;
  textSecondary: string;
  onChangeText: (text: string) => void;
  onEnter: () => void;
  onBackspaceEmpty: () => void;
  onFocus: () => void;
  onToggleCheck: () => void;
  refSetter: (ref: TextInput | null) => void;
  locked: boolean;
}

function BlockView({ block, accentColor, textPrimary, textSecondary, onChangeText, onEnter, onBackspaceEmpty, onFocus, onToggleCheck, refSetter, locked }: BlockProps) {
  function handleChange(text: string) {
    const nl = text.indexOf('\n');
    if (nl !== -1) { onChangeText(text.slice(0, nl)); onEnter(); return; }
    onChangeText(text);
  }
  function handleKey({ nativeEvent: { key } }: { nativeEvent: { key: string } }) {
    if (key === 'Backspace' && block.text === '') onBackspaceEmpty();
  }

  const accentDim = accentColor === '#C4A87A' ? '#9A7840' : accentColor;

  if (block.type === 'h1') {
    return (
      <View style={bs.row}>
        {locked
          ? <Text style={[bs.h1Text, { color: accentDim }]}>{block.text || ' '}</Text>
          : <TextInput ref={refSetter} style={[bs.input, bs.h1Input, { color: accentDim }]}
              value={block.text} onChangeText={handleChange} onKeyPress={handleKey} onFocus={onFocus}
              placeholder="Heading" placeholderTextColor={accentColor + '55'} multiline scrollEnabled={false} />
        }
      </View>
    );
  }
  if (block.type === 'bullet') {
    return (
      <View style={bs.row}>
        <View style={[bs.bulletDot, { backgroundColor: accentColor }]} />
        {locked
          ? <Text style={[bs.bodyText, { color: textPrimary }]}>{block.text || ' '}</Text>
          : <TextInput ref={refSetter} style={[bs.input, bs.bodyInput, { color: textPrimary }]}
              value={block.text} onChangeText={handleChange} onKeyPress={handleKey} onFocus={onFocus}
              placeholder="List item" placeholderTextColor={textSecondary} multiline scrollEnabled={false} />
        }
      </View>
    );
  }
  if (block.type === 'quote') {
    return (
      <View style={[bs.quoteWrap, { borderLeftColor: accentColor + '88' }]}>
        {locked
          ? <Text style={[bs.quoteText, { color: textSecondary }]}>{block.text || ' '}</Text>
          : <TextInput ref={refSetter} style={[bs.input, bs.quoteInput, { color: textSecondary }]}
              value={block.text} onChangeText={handleChange} onKeyPress={handleKey} onFocus={onFocus}
              placeholder="A thought worth quoting…" placeholderTextColor={textSecondary} multiline scrollEnabled={false} />
        }
      </View>
    );
  }
  if (block.type === 'checklist') {
    return (
      <View style={bs.row}>
        <TouchableOpacity
          style={[bs.checkBox, { borderColor: accentColor + '66' }, block.checked && { backgroundColor: accentColor, borderColor: accentColor }]}
          onPress={onToggleCheck} disabled={locked}
        >
          {block.checked && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
        </TouchableOpacity>
        {locked
          ? <Text style={[bs.bodyText, { color: textPrimary }, block.checked && bs.checkedText]}>{block.text || ' '}</Text>
          : <TextInput ref={refSetter} style={[bs.input, bs.bodyInput, { color: textPrimary }, block.checked && bs.checkedInput]}
              value={block.text} onChangeText={handleChange} onKeyPress={handleKey} onFocus={onFocus}
              placeholder="To-do item" placeholderTextColor={textSecondary} multiline scrollEnabled={false} />
        }
      </View>
    );
  }
  // Paragraph (default)
  return (
    <View style={bs.row}>
      {locked
        ? <Text style={[bs.bodyText, { color: textPrimary }]}>{block.text || ' '}</Text>
        : <TextInput ref={refSetter} style={[bs.input, bs.bodyInput, { color: textPrimary }]}
            value={block.text} onChangeText={handleChange} onKeyPress={handleKey} onFocus={onFocus}
            placeholder="Write something…" placeholderTextColor={textSecondary + '88'} multiline scrollEnabled={false} />
      }
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function JournalScreen() {
  const { session } = useAuthStore();
  const today = useTodayStore();
  const journal = useJournalStore();
  const theme = useAmbientTheme();
  const userId = session?.user.id;

  const [activeDate, setActiveDate] = useState(new Date());
  const activeDateKey = toIso(activeDate);
  const todayKey = toIso(new Date());
  const isToday = activeDateKey === todayKey;
  const isFuture = activeDateKey > todayKey;

  const entry = journal.entries[activeDateKey];
  const [blocks, setBlocks] = useState<Block[]>([makeBlock('p')]);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [promptDismissed, setPromptDismissed] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRefs = useRef<Record<string, TextInput | null>>({});
  const isSaving = journal.savingDate === activeDateKey;

  const cycleState: CycleState = today.cycleState ?? 'stable';
  const accent = CYCLE_COLORS[cycleState];
  const accentDim = accent === '#C4A87A' ? '#9A7840' : accent;
  const isLocked = entry?.locked ?? false;
  const wc = totalWords(blocks);
  const isEmpty = blocks.every((b) => b.text.trim() === '');
  const showPrompt = isToday && !isLocked && !isFuture && !promptDismissed && isEmpty;

  // ── Fix: day strip follows activeDate, not today ──────────────────────────
  const stripAnchor = activeDateKey <= todayKey ? activeDate : new Date();
  const stripDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(stripAnchor, -6 + i)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeDateKey, todayKey],
  );

  // Load entry on date change
  useEffect(() => {
    if (userId) journal.loadEntry(userId, activeDateKey);
    setPromptDismissed(false);
    setFocusedId(null);
  }, [userId, activeDateKey]);

  // Sync blocks when entry loads
  useEffect(() => {
    setBlocks(stringToBlocks(entry?.text ?? ''));
  }, [entry?.id, activeDateKey]);

  // Auto-save
  const scheduleSave = useCallback((newBlocks: Block[]) => {
    if (!userId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      journal.saveEntry(userId, activeDateKey, blocksToString(newBlocks), {
        cycleState: today.cycleState,
        moodScore: today.moodScore ?? undefined,
      });
    }, 1200);
  }, [userId, activeDateKey, today.cycleState, today.moodScore]);

  function updateBlocks(newBlocks: Block[]) {
    setBlocks(newBlocks);
    scheduleSave(newBlocks);
  }
  function updateBlockText(id: string, text: string) {
    updateBlocks(blocks.map((b) => b.id === id ? { ...b, text } : b));
  }
  function addBlockAfter(id: string) {
    const idx = blocks.findIndex((b) => b.id === id);
    const cur = blocks[idx];
    const newType: BlockType = (cur?.type === 'bullet' || cur?.type === 'checklist') ? cur.type : 'p';
    const nb = makeBlock(newType);
    updateBlocks([...blocks.slice(0, idx + 1), nb, ...blocks.slice(idx + 1)]);
    setTimeout(() => inputRefs.current[nb.id]?.focus(), 60);
  }
  function deleteBlock(id: string) {
    if (blocks.length <= 1) return;
    const idx = blocks.findIndex((b) => b.id === id);
    const newBlocks = blocks.filter((b) => b.id !== id);
    updateBlocks(newBlocks);
    const prev = newBlocks[Math.max(0, idx - 1)];
    if (prev) setTimeout(() => inputRefs.current[prev.id]?.focus(), 60);
  }
  function toggleCheck(id: string) {
    updateBlocks(blocks.map((b) => b.id === id ? { ...b, checked: !b.checked } : b));
  }
  function changeBlockType(type: BlockType) {
    if (!focusedId) {
      const nb = makeBlock(type);
      updateBlocks([...blocks, nb]);
      setTimeout(() => inputRefs.current[nb.id]?.focus(), 60);
      setFocusedId(nb.id);
      return;
    }
    updateBlocks(blocks.map((b) => b.id === focusedId ? { ...b, type } : b));
  }
  function navigateDate(dir: -1 | 1) {
    setActiveDate((d) => addDays(d, dir));
  }
  function insertPromptLine(line: string) {
    const nb = makeBlock('p', line);
    updateBlocks(isEmpty ? [nb] : [...blocks, nb]);
    setPromptDismissed(true);
    setTimeout(() => inputRefs.current[nb.id]?.focus(), 80);
  }

  const focusedBlock = blocks.find((b) => b.id === focusedId);
  const prompt = CYCLE_PROMPTS[cycleState];

  return (
    <SafeAreaView style={s.safe} edges={['left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <View style={s.header}>
          <TouchableOpacity
            style={[s.arrowBtn, { backgroundColor: accent + '18' }]}
            onPress={() => navigateDate(-1)}
            activeOpacity={0.6}
          >
            <Ionicons name="chevron-back" size={20} color={accentDim} />
          </TouchableOpacity>

          <View style={s.headerCenter}>
            <Text style={[s.headerTitle, { color: theme.textPrimary }]}>{formatBigDate(activeDate)}</Text>
            <Text style={[s.headerSub, { color: theme.textSecondary }]}>{formatSubDate(activeDate)}</Text>
          </View>

          <TouchableOpacity
            style={[s.arrowBtn, { backgroundColor: isToday ? 'transparent' : accent + '18' }]}
            onPress={() => navigateDate(1)}
            disabled={isToday}
            activeOpacity={0.6}
          >
            <Ionicons name="chevron-forward" size={20} color={isToday ? theme.textSecondary + '40' : accentDim} />
          </TouchableOpacity>
        </View>

        {/* ── Day strip ──────────────────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.stripWrap}
          style={s.stripScroll}
        >
          {stripDays.map((d) => {
            const key = toIso(d);
            const isActive = key === activeDateKey;
            const hasEntry = !!(journal.entries[key]?.text?.trim());
            return (
              <TouchableOpacity
                key={key}
                style={[s.dayChip, isActive && { backgroundColor: accent, borderColor: accent }]}
                onPress={() => setActiveDate(d)}
                activeOpacity={0.7}
              >
                <Text style={[s.dayChipWkd, { color: isActive ? 'rgba(255,255,255,0.75)' : theme.textSecondary }]}>
                  {WEEKDAY_SHORT[d.getDay()]}
                </Text>
                <Text style={[s.dayChipNum, { color: isActive ? '#FFFFFF' : theme.textPrimary }]}>
                  {d.getDate()}
                </Text>
                <View style={[s.dayDot, { backgroundColor: hasEntry ? (isActive ? 'rgba(255,255,255,0.65)' : accent) : 'transparent' }]} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Status bar ─────────────────────────────────────────────────────── */}
        <View style={[s.statusBar, { borderColor: accent + '25' }]}>
          <View style={[s.cyclePill, { backgroundColor: accent + '18', borderColor: accent + '44' }]}>
            <View style={[s.cycleDot, { backgroundColor: accent }]} />
            <Text style={[s.cycleLabel, { color: accentDim }]}>{CYCLE_LABELS[cycleState]}</Text>
          </View>
          {isLocked && (
            <View style={s.lockedBadge}>
              <Ionicons name="lock-closed-outline" size={10} color={theme.textSecondary} />
              <Text style={[s.lockedText, { color: theme.textSecondary }]}>Locked</Text>
            </View>
          )}
          <View style={{ flex: 1 }} />
          {wc > 0 && <Text style={[s.metaText, { color: theme.textSecondary }]}>{wc} words</Text>}
          {isSaving
            ? <Text style={[s.metaText, { color: theme.textSecondary }]}>Saving…</Text>
            : entry?.updatedAt
              ? <Text style={[s.metaText, { color: accent }]}>✓ Saved</Text>
              : null
          }
        </View>

        {/* ── Editor ─────────────────────────────────────────────────────────── */}
        {isFuture ? (
          <View style={s.emptyState}>
            <Ionicons name="calendar-outline" size={36} color={theme.textSecondary + '44'} />
            <Text style={[s.emptyTitle, { color: theme.textSecondary }]}>Future date</Text>
            <Text style={[s.emptyBody, { color: theme.textSecondary }]}>Navigate back to write in your journal.</Text>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={s.editorScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Prompt card */}
            {showPrompt && (
              <View style={[s.promptCard, { backgroundColor: accent + '12', borderColor: accent + '33', borderLeftColor: accent }]}>
                <View style={s.promptTop}>
                  <Text style={s.promptIcon}>{prompt.icon}</Text>
                  <Text style={[s.promptTitle, { color: accentDim }]}>{prompt.title}</Text>
                  <TouchableOpacity
                    onPress={() => setPromptDismissed(true)}
                    hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                    style={{ marginLeft: 'auto' as unknown as number }}
                  >
                    <Ionicons name="close" size={16} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
                <View style={s.promptLines}>
                  {prompt.lines.map((line, i) => (
                    <TouchableOpacity key={i} style={s.promptLine} onPress={() => insertPromptLine(line)} activeOpacity={0.6}>
                      <View style={[s.promptLineDot, { backgroundColor: accent }]} />
                      <Text style={[s.promptLineText, { color: theme.textSecondary }]}>{line}</Text>
                      <Ionicons name="arrow-forward" size={13} color={accent + '88'} />
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={[s.promptHint, { color: theme.textSecondary }]}>Tap a prompt · or just start writing below</Text>
              </View>
            )}

            {/* Writing area */}
            <Pressable
              style={[s.paper, { borderColor: accent + '22' }]}
              onPress={() => {
                const last = blocks[blocks.length - 1];
                if (last) setTimeout(() => inputRefs.current[last.id]?.focus(), 60);
              }}
            >
              {blocks.map((block) => (
                <BlockView
                  key={block.id}
                  block={block}
                  accentColor={accent}
                  textPrimary={theme.textPrimary}
                  textSecondary={theme.textSecondary}
                  locked={isLocked}
                  onChangeText={(text) => updateBlockText(block.id, text)}
                  onEnter={() => addBlockAfter(block.id)}
                  onBackspaceEmpty={() => deleteBlock(block.id)}
                  onFocus={() => setFocusedId(block.id)}
                  onToggleCheck={() => toggleCheck(block.id)}
                  refSetter={(ref) => { inputRefs.current[block.id] = ref; }}
                />
              ))}
              {!isLocked && (
                <TouchableOpacity
                  style={s.addLineBtn}
                  onPress={() => {
                    const nb = makeBlock('p');
                    updateBlocks([...blocks, nb]);
                    setTimeout(() => inputRefs.current[nb.id]?.focus(), 60);
                  }}
                  activeOpacity={0.5}
                >
                  <Ionicons name="add" size={14} color={accent + '66'} />
                  <Text style={[s.addLineText, { color: accent + '66' }]}>Add line</Text>
                </TouchableOpacity>
              )}
            </Pressable>

            <View style={{ height: 60 }} />
          </ScrollView>
        )}

        {/* ── Toolbar ────────────────────────────────────────────────────────── */}
        {!isLocked && !isFuture && (
          <View style={[s.toolbar, { borderTopColor: accent + '22' }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.toolbarInner}>
              {BLOCK_TOOLS.map((tool) => {
                const isActive = focusedBlock?.type === tool.type;
                return (
                  <TouchableOpacity
                    key={tool.type}
                    style={[s.toolBtn, isActive && { backgroundColor: accent + '20', borderColor: accent }]}
                    onPress={() => changeBlockType(tool.type)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={tool.icon}
                      size={15}
                      color={isActive ? accentDim : theme.textSecondary}
                    />
                    <Text style={[s.toolLabel, { color: isActive ? accentDim : theme.textSecondary }]}>{tool.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Block styles ─────────────────────────────────────────────────────────────

const bs = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 18, paddingVertical: 1 },
  input: { flex: 1 },
  bodyInput: { fontSize: 16, lineHeight: 27, minHeight: 27, paddingVertical: 3 },
  bodyText: { flex: 1, fontSize: 16, lineHeight: 27 },
  h1Input: { fontSize: 22, fontWeight: '700', lineHeight: 30, letterSpacing: -0.4, paddingVertical: 6, paddingTop: 14 },
  h1Text: { flex: 1, fontSize: 22, fontWeight: '700', lineHeight: 30, letterSpacing: -0.4, paddingTop: 14, paddingVertical: 6 },
  bulletDot: { width: 5, height: 5, borderRadius: 2.5, flexShrink: 0, marginRight: 10, marginTop: 12 },
  quoteWrap: { borderLeftWidth: 3, marginHorizontal: 18, paddingLeft: 14, paddingVertical: 6, marginVertical: 3 },
  quoteInput: { fontSize: 15, fontStyle: 'italic', lineHeight: 25, paddingVertical: 2 },
  quoteText: { fontSize: 15, fontStyle: 'italic', lineHeight: 25 },
  checkBox: {
    width: 19, height: 19, borderRadius: 5, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10, marginTop: 7, flexShrink: 0,
  },
  checkedText: { textDecorationLine: 'line-through', opacity: 0.35 },
  checkedInput: { textDecorationLine: 'line-through', opacity: 0.4 },
});

// ─── Screen styles ────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingTop: 14, paddingBottom: 10,
  },
  arrowBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  headerSub: { fontSize: 11, marginTop: 1, opacity: 0.6 },

  // Day strip
  stripScroll: { maxHeight: 82, flexGrow: 0 },
  stripWrap: { paddingHorizontal: 14, paddingBottom: 10, gap: 7 },
  dayChip: {
    width: 44, height: 64, borderRadius: 16, borderWidth: 1.5,
    borderColor: '#E8E4DF', alignItems: 'center', justifyContent: 'center',
    gap: 3, paddingVertical: 10,
    backgroundColor: '#FAFAF8',
  },
  dayChipWkd: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  dayChipNum: { fontSize: 16, fontWeight: '700' },
  dayDot: { width: 5, height: 5, borderRadius: 2.5 },

  // Status bar
  statusBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 7,
    borderTopWidth: 1, borderBottomWidth: 1,
  },
  cyclePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
  },
  cycleDot: { width: 6, height: 6, borderRadius: 3 },
  cycleLabel: { fontSize: 11, fontWeight: '700' },
  lockedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, opacity: 0.5 },
  lockedText: { fontSize: 11 },
  metaText: { fontSize: 11, opacity: 0.6 },

  // Editor
  editorScroll: { flexGrow: 1, paddingTop: 14, paddingBottom: 40 },

  // Prompt card
  promptCard: {
    marginHorizontal: 16, marginBottom: 14,
    borderRadius: 14, borderWidth: 1.5, borderLeftWidth: 3,
    padding: 14, paddingLeft: 16,
  },
  promptTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  promptIcon: { fontSize: 18 },
  promptTitle: { fontSize: 14, fontWeight: '700' },
  promptLines: { gap: 2 },
  promptLine: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, paddingHorizontal: 2,
  },
  promptLineDot: { width: 5, height: 5, borderRadius: 2.5, flexShrink: 0 },
  promptLineText: { flex: 1, fontSize: 14, lineHeight: 20 },
  promptHint: { fontSize: 11, textAlign: 'center', marginTop: 10, opacity: 0.5 },

  // Paper / writing area
  paper: {
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 18, borderWidth: 1.5,
    paddingVertical: 10, paddingBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  addLineBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginHorizontal: 18, marginTop: 8, paddingVertical: 4,
  },
  addLineText: { fontSize: 12 },

  // Toolbar
  toolbar: {
    borderTopWidth: 1, backgroundColor: '#FFFFFF', paddingVertical: 9,
  },
  toolbarInner: { paddingHorizontal: 14, gap: 6, alignItems: 'center' },
  toolBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1.5, borderColor: '#ECEAE6',
  },
  toolLabel: { fontSize: 12, fontWeight: '500' },

  // Empty / future state
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', opacity: 0.4 },
  emptyBody: { fontSize: 13, textAlign: 'center', opacity: 0.35, lineHeight: 20 },
});
