import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  stable: '#A8C5A0', manic: '#89B4CC', depressive: '#C4A0B0', mixed: '#E8DCC8',
};
const CYCLE_LABELS: Record<CycleState, string> = {
  stable: 'Stable', manic: 'Elevated', depressive: 'Low', mixed: 'Mixed',
};
const MOOD_EMOJIS = ['😔', '😟', '😕', '😐', '🙂', '😊', '😄', '😁', '🤩', '✨'];

const CYCLE_PROMPTS: Record<CycleState, { title: string; lines: string[] }> = {
  stable:     { title: "A good day to reflect", lines: ["What went well today?", "Who did you connect with?", "What are you grateful for?"] },
  manic:      { title: "Slow down for a moment", lines: ["What's racing through your mind?", "What can you let go of today?", "What would help you feel grounded?"] },
  depressive: { title: "Even a few words is enough", lines: ["How are you feeling in your body?", "One small thing that happened today?", "What do you need most right now?"] },
  mixed:      { title: "Whatever you feel is valid", lines: ["Describe your mood in three words.", "What's been hardest today?", "What would make tomorrow easier?"] },
};

const BLOCK_TOOLS: { type: BlockType; icon: string; label: string }[] = [
  { type: 'p',         icon: '¶',  label: 'Text' },
  { type: 'h1',        icon: 'H',  label: 'Heading' },
  { type: 'bullet',    icon: '•',  label: 'Bullet' },
  { type: 'quote',     icon: '"',  label: 'Quote' },
  { type: 'checklist', icon: '☐',  label: 'Check' },
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
  // Legacy plain text → single paragraph block
  return [{ id: 'legacy', type: 'p', text: str }];
}

function makeBlock(type: BlockType = 'p', text = ''): Block {
  return { id: `b${Date.now()}${Math.random().toString(36).slice(2, 6)}`, type, text };
}

function totalWords(blocks: Block[]) {
  return blocks.map((b) => b.text.trim().split(/\s+/).filter(Boolean).length).reduce((a, b) => a + b, 0);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addDays(date: Date, days: number) {
  const d = new Date(date); d.setDate(d.getDate() + days); return d;
}
function toIso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function formatBigDate(d: Date) {
  const isToday = toIso(d) === toIso(new Date());
  if (isToday) return 'Today';
  const isYesterday = toIso(d) === toIso(addDays(new Date(), -1));
  if (isYesterday) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}
function formatSubDate(d: Date) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ─── Single block component ───────────────────────────────────────────────────

interface BlockProps {
  block: Block;
  accentColor: string;
  textPrimary: string;
  textSecondary: string;
  focused: boolean;
  onChangeText: (text: string) => void;
  onEnter: () => void;
  onBackspaceEmpty: () => void;
  onFocus: () => void;
  onToggleCheck: () => void;
  refSetter: (ref: TextInput | null) => void;
  locked: boolean;
}

function BlockView({ block, accentColor, textPrimary, textSecondary, focused, onChangeText, onEnter, onBackspaceEmpty, onFocus, onToggleCheck, refSetter, locked }: BlockProps) {
  function handleChange(text: string) {
    const nl = text.indexOf('\n');
    if (nl !== -1) {
      onChangeText(text.slice(0, nl));
      onEnter();
      return;
    }
    onChangeText(text);
  }

  function handleKey({ nativeEvent: { key } }: { nativeEvent: { key: string } }) {
    if (key === 'Backspace' && block.text === '') onBackspaceEmpty();
  }

  const accentDim = accentColor === '#E8DCC8' ? '#A09060' : accentColor;

  if (block.type === 'h1') {
    return (
      <View style={bs.row}>
        {locked
          ? <Text style={[bs.h1Text, { color: accentDim }]}>{block.text || ' '}</Text>
          : <TextInput
              ref={refSetter} style={[bs.input, bs.h1Input, { color: accentDim }]}
              value={block.text} onChangeText={handleChange} onKeyPress={handleKey} onFocus={onFocus}
              placeholder="Heading" placeholderTextColor={accentColor + '55'}
              multiline scrollEnabled={false}
            />
        }
      </View>
    );
  }

  if (block.type === 'bullet') {
    return (
      <View style={bs.row}>
        <View style={[bs.bulletDot, { backgroundColor: accentColor, marginTop: 11 }]} />
        {locked
          ? <Text style={[bs.bodyText, { color: textPrimary }]}>{block.text || ' '}</Text>
          : <TextInput
              ref={refSetter} style={[bs.input, bs.bodyInput, { color: textPrimary }]}
              value={block.text} onChangeText={handleChange} onKeyPress={handleKey} onFocus={onFocus}
              placeholder="List item" placeholderTextColor={textSecondary}
              multiline scrollEnabled={false}
            />
        }
      </View>
    );
  }

  if (block.type === 'quote') {
    return (
      <View style={[bs.quoteWrap, { borderLeftColor: accentColor }]}>
        {locked
          ? <Text style={[bs.quoteText, { color: textSecondary, opacity: 1 }]}>{block.text || ' '}</Text>
          : <TextInput
              ref={refSetter} style={[bs.input, bs.quoteInput, { color: textSecondary, opacity: 1 }]}
              value={block.text} onChangeText={handleChange} onKeyPress={handleKey} onFocus={onFocus}
              placeholder="Quote…" placeholderTextColor={textSecondary}
              multiline scrollEnabled={false}
            />
        }
      </View>
    );
  }

  if (block.type === 'checklist') {
    return (
      <View style={bs.row}>
        <TouchableOpacity
          style={[bs.checkBox, block.checked && { backgroundColor: accentColor, borderColor: accentColor }]}
          onPress={onToggleCheck}
          disabled={locked}
        >
          {block.checked && <Text style={bs.checkMark}>✓</Text>}
        </TouchableOpacity>
        {locked
          ? <Text style={[bs.bodyText, { color: textPrimary }, block.checked && bs.checkedText]}>{block.text || ' '}</Text>
          : <TextInput
              ref={refSetter} style={[bs.input, bs.bodyInput, { color: textPrimary }, block.checked && bs.checkedInput]}
              value={block.text} onChangeText={handleChange} onKeyPress={handleKey} onFocus={onFocus}
              placeholder="To-do" placeholderTextColor={textSecondary}
              multiline scrollEnabled={false}
            />
        }
      </View>
    );
  }

  // Default paragraph
  return (
    <View style={bs.row}>
      {locked
        ? <Text style={[bs.bodyText, { color: textPrimary }]}>{block.text || ' '}</Text>
        : <TextInput
            ref={refSetter} style={[bs.input, bs.bodyInput, { color: textPrimary }]}
            value={block.text} onChangeText={handleChange} onKeyPress={handleKey} onFocus={onFocus}
            placeholder="Write something…" placeholderTextColor={textSecondary}
            multiline scrollEnabled={false}
          />
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
  const isToday = activeDateKey === toIso(new Date());
  const isFuture = activeDate > new Date();

  const entry = journal.entries[activeDateKey];
  const [blocks, setBlocks] = useState<Block[]>([makeBlock('p')]);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [promptDismissed, setPromptDismissed] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRefs = useRef<Record<string, TextInput | null>>({});
  const isSaving = journal.savingDate === activeDateKey;

  const cycleState: CycleState = today.cycleState ?? 'stable';
  const accentColor = CYCLE_COLORS[cycleState];
  const isLocked = entry?.locked ?? false;
  const wc = totalWords(blocks);
  const isEmpty = blocks.every((b) => b.text.trim() === '');
  const showPrompt = isToday && !isLocked && !isFuture && !promptDismissed && isEmpty;

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
    const newBlocks = blocks.map((b) => b.id === id ? { ...b, text } : b);
    updateBlocks(newBlocks);
  }

  function addBlockAfter(id: string) {
    const idx = blocks.findIndex((b) => b.id === id);
    const current = blocks[idx];
    // Continue lists, otherwise fall back to paragraph
    const newType: BlockType = (current?.type === 'bullet' || current?.type === 'checklist') ? current.type : 'p';
    const nb = makeBlock(newType);
    const newBlocks = [...blocks.slice(0, idx + 1), nb, ...blocks.slice(idx + 1)];
    updateBlocks(newBlocks);
    setTimeout(() => inputRefs.current[nb.id]?.focus(), 60);
  }

  function deleteBlock(id: string) {
    if (blocks.length <= 1) return;
    const idx = blocks.findIndex((b) => b.id === id);
    const newBlocks = blocks.filter((b) => b.id !== id);
    updateBlocks(newBlocks);
    // Focus previous block
    const prevBlock = newBlocks[Math.max(0, idx - 1)];
    if (prevBlock) setTimeout(() => inputRefs.current[prevBlock.id]?.focus(), 60);
  }

  function toggleCheck(id: string) {
    const newBlocks = blocks.map((b) => b.id === id ? { ...b, checked: !b.checked } : b);
    updateBlocks(newBlocks);
  }

  function changeBlockType(type: BlockType) {
    if (!focusedId) {
      // Add new block at end
      const nb = makeBlock(type);
      const newBlocks = [...blocks, nb];
      updateBlocks(newBlocks);
      setTimeout(() => inputRefs.current[nb.id]?.focus(), 60);
      setFocusedId(nb.id);
      return;
    }
    const newBlocks = blocks.map((b) => b.id === focusedId ? { ...b, type } : b);
    updateBlocks(newBlocks);
  }

  function navigateDate(dir: -1 | 1) {
    setActiveDate((d) => addDays(d, dir));
  }

  function insertPromptLine(line: string) {
    const nb = makeBlock('p', line);
    const newBlocks = isEmpty ? [nb] : [...blocks, nb];
    updateBlocks(newBlocks);
    setPromptDismissed(true);
    setTimeout(() => inputRefs.current[nb.id]?.focus(), 80);
  }

  // Recent 7-day strip
  const todayKey = toIso(new Date());
  const recentDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(new Date(), -6 + i)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todayKey],
  );
  const focusedBlock = blocks.find((b) => b.id === focusedId);

  return (
    <SafeAreaView style={s.safe} edges={['left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

        {/* ── Date navigation ─────────────────────────────────────────────── */}
        <View style={[s.nav, theme.cardSurface, { marginHorizontal: 14, marginTop: 12, marginBottom: 4 }]}>
          <TouchableOpacity
            onPress={() => navigateDate(-1)}
            style={[s.navArrow, { backgroundColor: accentColor + '22' }]}
            activeOpacity={0.6}
          >
            <Text style={[s.navArrowText, { color: accentColor }]}>‹</Text>
          </TouchableOpacity>
          <View style={s.navCenter}>
            <Text style={[s.navTitle, { color: theme.textPrimary }]}>{formatBigDate(activeDate)}</Text>
            <Text style={[s.navSub, { color: theme.textSecondary, opacity: 1 }]}>{formatSubDate(activeDate)}</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigateDate(1)}
            style={[s.navArrow, { backgroundColor: isToday ? '#0000000A' : accentColor + '22' }]}
            disabled={isToday}
            activeOpacity={0.6}
          >
            <Text style={[s.navArrowText, { color: isToday ? '#3D393530' : accentColor }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── 7-day strip ─────────────────────────────────────────────────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.dayStrip} style={{ maxHeight: 80 }}>
          {recentDays.map((d) => {
            const key = toIso(d);
            const isActive = key === activeDateKey;
            const dayEntry = journal.entries[key];
            const hasEntry = dayEntry && dayEntry.text.trim().length > 0;
            const dayLetter = d.toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 1);
            const dayNum = d.getDate();
            return (
              <TouchableOpacity
                key={key}
                style={[
                  s.dayChip,
                  theme.cardSurface,
                  isActive && { backgroundColor: accentColor, borderColor: accentColor, shadowColor: accentColor, shadowOpacity: 0.35, elevation: 6 },
                ]}
                onPress={() => setActiveDate(d)}
                activeOpacity={0.7}
              >
                <Text style={[s.dayChipLetter, { color: theme.textSecondary }, isActive && { color: 'rgba(255,255,255,0.75)', opacity: 1 }]}>{dayLetter}</Text>
                <Text style={[s.dayChipNum, { color: theme.textPrimary }, isActive && { color: '#FFFFFF', opacity: 1 }]}>{dayNum}</Text>
                {hasEntry && <View style={[s.dayDot, { backgroundColor: isActive ? 'rgba(255,255,255,0.7)' : accentColor }]} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Context strip ────────────────────────────────────────────────── */}
        <View style={[s.contextStrip, { borderColor: accentColor + '30' }]}>
          <View style={[s.statePill, { backgroundColor: accentColor + '22', borderColor: accentColor + '55' }]}>
            <View style={[s.stateDot, { backgroundColor: accentColor }]} />
            <Text style={[s.stateText, { color: accentColor }]}>{CYCLE_LABELS[cycleState]}</Text>
          </View>
          {today.moodScore !== null && (
            <Text style={[s.moodText, { color: theme.textSecondary, opacity: 1 }]}>{MOOD_EMOJIS[today.moodScore - 1]} {today.moodScore}/10</Text>
          )}
          <View style={{ flex: 1 }} />
          {wc > 0 && <Text style={[s.metaText, { color: theme.textSecondary, opacity: 1 }]}>{wc} words</Text>}
          {isSaving
            ? <Text style={[s.metaText, { color: theme.textSecondary, opacity: 1 }]}>Saving…</Text>
            : entry?.updatedAt ? <Text style={[s.metaText, { color: '#A8C5A0' }]}>Saved ✓</Text>
            : null}
          {isLocked && (
            <View style={s.lockBadge}><Text style={[s.lockText, { color: theme.textSecondary, opacity: 1 }]}>🔒 Locked</Text></View>
          )}
        </View>

        {/* ── Editor ───────────────────────────────────────────────────────── */}
        {isFuture ? (
          <View style={s.emptyState}><Text style={[s.emptyText, { color: theme.textSecondary, opacity: 1 }]}>No entries for future dates.</Text></View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={s.editorScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Prompt card */}
            {showPrompt && (
              <View style={[s.promptCard, theme.cardSurface, { borderColor: accentColor + '44', backgroundColor: accentColor + '0D' }]}>
                <View style={s.promptHeader}>
                  <Text style={[s.promptTitle, { color: accentColor === '#E8DCC8' ? '#A09060' : accentColor }]}>
                    {CYCLE_PROMPTS[cycleState].title}
                  </Text>
                  <TouchableOpacity onPress={() => setPromptDismissed(true)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                    <Text style={[s.promptDismiss, { color: theme.textSecondary, opacity: 1 }]}>✕</Text>
                  </TouchableOpacity>
                </View>
                {CYCLE_PROMPTS[cycleState].lines.map((line, i) => (
                  <TouchableOpacity key={i} style={s.promptLine} onPress={() => insertPromptLine(line)} activeOpacity={0.65}>
                    <Text style={[s.promptArrow, { color: accentColor }]}>›</Text>
                    <Text style={[s.promptLineText, { color: theme.textSecondary, opacity: 1 }]}>{line}</Text>
                  </TouchableOpacity>
                ))}
                <Text style={[s.promptHint, { color: theme.textSecondary, opacity: 1 }]}>Tap a prompt to start · or just write below</Text>
              </View>
            )}

            {/* Blocks — opaque white card so text is always readable */}
            <View style={[s.blocksCard, { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: accentColor + '30' }]}>
              {blocks.map((block) => (
                <BlockView
                  key={block.id}
                  block={block}
                  accentColor={accentColor}
                  textPrimary={theme.textPrimary}
                  textSecondary={theme.textSecondary}
                  focused={focusedId === block.id}
                  locked={isLocked}
                  onChangeText={(text) => updateBlockText(block.id, text)}
                  onEnter={() => addBlockAfter(block.id)}
                  onBackspaceEmpty={() => deleteBlock(block.id)}
                  onFocus={() => setFocusedId(block.id)}
                  onToggleCheck={() => toggleCheck(block.id)}
                  refSetter={(ref) => { inputRefs.current[block.id] = ref; }}
                />
              ))}
            </View>
            <View style={{ height: 60 }} />
          </ScrollView>
        )}

        {/* ── Block toolbar ─────────────────────────────────────────────────── */}
        {!isLocked && !isFuture && (
          <View style={[s.toolbar, theme.cardSurface, { borderTopColor: accentColor + '30' }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.toolbarInner}>
              {BLOCK_TOOLS.map((tool) => {
                const isActive = focusedBlock?.type === tool.type;
                return (
                  <TouchableOpacity
                    key={tool.type}
                    style={[
                      s.toolBtn,
                      { borderColor: isActive ? accentColor : accentColor + '30', backgroundColor: isActive ? accentColor + '18' : 'transparent' },
                    ]}
                    onPress={() => changeBlockType(tool.type)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.toolIcon, { color: isActive ? accentColor : theme.textSecondary }]}>{tool.icon}</Text>
                    <Text style={[s.toolLabel, { color: isActive ? accentColor : theme.textSecondary }]}>{tool.label}</Text>
                  </TouchableOpacity>
                );
              })}
              <View style={[s.toolSep, { backgroundColor: accentColor + '30' }]} />
              <TouchableOpacity
                style={[s.toolAddBtn, { backgroundColor: accentColor + '18', borderRadius: 10, borderWidth: 1.5, borderColor: accentColor + '40' }]}
                onPress={() => { const nb = makeBlock('p'); updateBlocks([...blocks, nb]); setTimeout(() => inputRefs.current[nb.id]?.focus(), 60); }}
                activeOpacity={0.7}
              >
                <Text style={[s.toolAddText, { color: accentColor }]}>+ Block</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Block styles ─────────────────────────────────────────────────────────────

const bs = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingVertical: 2 },
  input: { flex: 1, color: '#3D3935' },
  bodyInput: { fontSize: 17, lineHeight: 28, minHeight: 28, paddingVertical: 4 },
  bodyText: { flex: 1, fontSize: 17, color: '#3D3935', lineHeight: 28 },
  h1Input: { fontSize: 24, fontWeight: '700', lineHeight: 32, letterSpacing: -0.5, paddingVertical: 8, paddingTop: 16 },
  h1Text: { flex: 1, fontSize: 24, fontWeight: '700', lineHeight: 32, letterSpacing: -0.5, paddingVertical: 8, paddingTop: 16 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0, marginRight: 10 },
  quoteWrap: { borderLeftWidth: 3, marginHorizontal: 20, paddingLeft: 14, paddingVertical: 4, marginVertical: 4 },
  quoteInput: { fontSize: 16, fontStyle: 'italic', lineHeight: 26, color: '#3D3935', opacity: 0.7, paddingVertical: 2 },
  quoteText: { fontSize: 16, fontStyle: 'italic', lineHeight: 26, color: '#3D3935', opacity: 0.7 },
  checkBox: {
    width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: '#3D393545',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10, marginTop: 7, flexShrink: 0,
  },
  checkMark: { fontSize: 12, color: '#FFFFFF', fontWeight: '700' },
  checkedText: { textDecorationLine: 'line-through', opacity: 0.35 },
  checkedInput: { textDecorationLine: 'line-through', opacity: 0.4 },
});

// ─── Screen styles ────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },

  nav: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1.5,
  },
  navArrow: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  navArrowText: { fontSize: 26, fontWeight: '600' },
  navArrowDisabled: { color: '#3D393525' },
  navCenter: { flex: 1, alignItems: 'center' },
  navTitle: { fontSize: 19, fontWeight: '700', color: '#3D3935', letterSpacing: -0.3 },
  navSub: { fontSize: 11, color: '#3D3935', opacity: 0.35, marginTop: 1 },

  dayStrip: { paddingHorizontal: 14, paddingVertical: 10, gap: 7 },
  dayChip: {
    width: 42, height: 62, paddingVertical: 8, alignItems: 'center', gap: 2,
    borderRadius: 14, borderWidth: 1.5,
  },
  dayChipLetter: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  dayChipNum: { fontSize: 15, fontWeight: '700' },
  dayDot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 1 },

  contextStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 8,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F0EDE8',
  },
  statePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
  },
  stateDot: { width: 7, height: 7, borderRadius: 3.5 },
  stateText: { fontSize: 12, fontWeight: '600' },
  moodText: { fontSize: 13, color: '#3D3935', opacity: 0.5 },
  metaText: { fontSize: 11, color: '#3D3935', opacity: 0.3 },
  lockBadge: { backgroundColor: '#E8DCC880', borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8 },
  lockText: { fontSize: 11, color: '#3D3935', opacity: 0.5, fontWeight: '500' },

  editorScroll: { flexGrow: 1, paddingTop: 12, paddingBottom: 40 },

  promptCard: {
    marginHorizontal: 16, marginBottom: 16,
    borderRadius: 16, borderWidth: 1.5, padding: 16,
  },
  promptHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  promptTitle: { fontSize: 14, fontWeight: '700' },
  promptDismiss: { fontSize: 14, color: '#3D3935', opacity: 0.25 },
  promptLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 7 },
  promptArrow: { fontSize: 18, lineHeight: 22, fontWeight: '700' },
  promptLineText: { fontSize: 14, color: '#3D3935', opacity: 0.6, lineHeight: 22, flex: 1 },
  promptHint: { fontSize: 11, color: '#3D3935', opacity: 0.3, textAlign: 'center', marginTop: 10 },

  toolbar: {
    borderTopWidth: 1, borderTopColor: '#F0EDE8',
    backgroundColor: '#FFFFFF', paddingVertical: 8,
  },
  toolbarInner: { paddingHorizontal: 12, gap: 8, alignItems: 'center' },
  toolBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1.5, borderColor: '#E0DDD8',
  },
  toolIcon: { fontSize: 15, color: '#3D3935', opacity: 0.5, fontWeight: '600' },
  toolLabel: { fontSize: 12, color: '#3D3935', opacity: 0.4, fontWeight: '500' },
  toolSep: { width: 1, height: 24, backgroundColor: '#E0DDD8', marginHorizontal: 4 },
  toolAddBtn: { paddingHorizontal: 14, paddingVertical: 8 },
  toolAddText: { fontSize: 13, fontWeight: '600' },

  blocksCard: {
    marginHorizontal: 16, marginBottom: 8,
    borderRadius: 16, paddingVertical: 8,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, color: '#3D3935', opacity: 0.3 },
});
