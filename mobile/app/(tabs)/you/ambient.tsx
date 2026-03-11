import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAmbientStore, SCENES } from '../../../stores/ambient';

// ─── Constants ────────────────────────────────────────────────────────────────

const SAGE = '#A8C5A0';
const CHARCOAL = '#3D3935';
const SURFACE = '#F7F3EE';
const SAND = '#E8DCC8';

// ─── Volume bar ───────────────────────────────────────────────────────────────

const VOLUME_STEPS = [0.2, 0.4, 0.6, 0.8, 1.0];

function VolumeControl() {
  const { volume, setVolume } = useAmbientStore();

  return (
    <View style={vc.wrap}>
      <Text style={vc.label}>🔈</Text>
      <View style={vc.bars}>
        {VOLUME_STEPS.map((step, i) => {
          const active = volume >= step - 0.05;
          return (
            <TouchableOpacity
              key={i}
              style={[vc.bar, { height: 8 + i * 4 }, active && vc.barActive]}
              onPress={() => setVolume(step)}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }}
            />
          );
        })}
      </View>
      <Text style={vc.label}>🔊</Text>
    </View>
  );
}

const vc = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, justifyContent: 'center', paddingVertical: 16 },
  label: { fontSize: 16, marginBottom: 2 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 5 },
  bar: { width: 14, borderRadius: 3, backgroundColor: '#E0DDD8' },
  barActive: { backgroundColor: SAGE },
});

// ─── Scene card ───────────────────────────────────────────────────────────────

function SceneCard({ scene }: { scene: typeof SCENES[number] }) {
  const { activeSceneId, isPlaying, loadError, selectScene, pause, resume } = useAmbientStore();
  const isActive = activeSceneId === scene.id;

  async function handlePress() {
    if (!isActive) {
      await selectScene(scene.id);
    } else if (isPlaying) {
      await pause();
    } else {
      await resume();
    }
  }

  return (
    <TouchableOpacity
      style={[sc.card, isActive && sc.cardActive, { borderColor: isActive ? scene.bgFrom : 'transparent' }]}
      onPress={handlePress}
      activeOpacity={0.82}
    >
      {/* Gradient-style background using two overlaid views */}
      <View style={[sc.bg, { backgroundColor: scene.bgFrom + '22' }]} />

      {/* Icon + playing dot */}
      <View style={sc.iconRow}>
        <Text style={sc.icon}>{scene.icon}</Text>
        {isActive && (
          <View style={[sc.dot, { backgroundColor: scene.bgFrom }]}>
            <Text style={sc.dotTxt}>{isPlaying ? '▶' : '❚❚'}</Text>
          </View>
        )}
      </View>

      <Text style={sc.label}>{scene.label}</Text>
      <Text style={sc.desc}>{scene.description}</Text>

      {/* "Files not added" note */}
      {isActive && loadError && (
        <View style={sc.errorBadge}>
          <Text style={sc.errorTxt}>Add .mp3 to assets/sounds/</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const sc = StyleSheet.create({
  card: {
    width: '47%', borderRadius: 20, padding: 16, marginBottom: 12,
    backgroundColor: '#FFFFFF', borderWidth: 2,
    shadowColor: CHARCOAL, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    overflow: 'hidden',
  },
  cardActive: {
    shadowOpacity: 0.14, shadowRadius: 12, elevation: 4,
  },
  bg: { ...StyleSheet.absoluteFillObject, borderRadius: 20 },
  iconRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  icon: { fontSize: 32 },
  dot: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  dotTxt: { fontSize: 8, color: '#FFFFFF', fontWeight: '800' },
  label: { fontSize: 16, fontWeight: '700', color: CHARCOAL, marginBottom: 4 },
  desc: { fontSize: 11, color: CHARCOAL, opacity: 0.5, lineHeight: 15 },
  errorBadge: { marginTop: 8, backgroundColor: SAND, borderRadius: 8, padding: 6 },
  errorTxt: { fontSize: 10, color: CHARCOAL, opacity: 0.6, fontStyle: 'italic' },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AmbientScreen() {
  const router = useRouter();
  const { activeSceneId, isPlaying, isExpoGo, stop } = useAmbientStore();
  const activeScene = SCENES.find((s) => s.id === activeSceneId);

  return (
    <SafeAreaView style={s.safe} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Nav */}
        <View style={s.nav}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
            <Text style={s.backTxt}>← Back</Text>
          </TouchableOpacity>
          {activeSceneId && (
            <TouchableOpacity onPress={stop} style={s.stopBtn} activeOpacity={0.7}>
              <Text style={s.stopTxt}>Stop</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Header */}
        <Text style={s.title}>Ambient Scenes</Text>
        <Text style={s.subtitle}>Calming soundscapes — not mood-dependent, play whatever feels right.</Text>

        {/* Under development banner */}
        <View style={s.devBanner}>
          <Text style={s.devBannerIcon}>🚧</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.devBannerTitle}>Under Development</Text>
            <Text style={s.devBannerText}>Visuals & audio are still being refined. Scene selection is live — sound requires a development build.</Text>
          </View>
        </View>

        {/* Now playing bar */}
        {activeScene && (
          <View style={[s.nowPlaying, { borderLeftColor: activeScene.bgFrom }]}>
            <Text style={s.nowPlayingIcon}>{activeScene.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.nowPlayingLabel}>
                {isPlaying ? 'Now playing' : 'Paused'} — {activeScene.label}
              </Text>
              <Text style={s.nowPlayingDesc}>{activeScene.description}</Text>
            </View>
            <View style={[s.playIndicator, { backgroundColor: activeScene.bgFrom + (isPlaying ? 'FF' : '55') }]}>
              <Text style={s.playIndicatorTxt}>{isPlaying ? '♪' : '❚❚'}</Text>
            </View>
          </View>
        )}

        {/* Expo Go notice */}
        {isExpoGo && (
          <View style={s.expoGoNotice}>
            <Text style={s.expoGoIcon}>🔧</Text>
            <Text style={s.expoGoText}>
              Audio playback requires a development build. Scene selection is previewed here — sound will play in the full build.
            </Text>
          </View>
        )}

        {/* Volume control — only shown when a scene is active and not Expo Go */}
        {activeSceneId && !isExpoGo && (
          <View style={s.volumeCard}>
            <Text style={s.volumeHeading}>Volume</Text>
            <VolumeControl />
          </View>
        )}

        {/* Scenes grid */}
        <Text style={s.gridLabel}>CHOOSE A SCENE</Text>
        <View style={s.grid}>
          {SCENES.map((scene) => (
            <SceneCard key={scene.id} scene={scene} />
          ))}
        </View>

        {/* Tip */}
        <View style={s.tipCard}>
          <Text style={s.tipIcon}>💡</Text>
          <Text style={s.tipText}>
            Ambient sounds continue playing while you use other parts of Equi.
            Tap the scene again to pause, or press Stop to end the session.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },

  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, marginBottom: 8 },
  backBtn: { paddingVertical: 4, paddingRight: 12 },
  backTxt: { fontSize: 15, color: SAGE, fontWeight: '600' },
  stopBtn: {
    backgroundColor: SURFACE, borderRadius: 20,
    paddingVertical: 5, paddingHorizontal: 14,
  },
  stopTxt: { fontSize: 13, color: CHARCOAL, opacity: 0.5, fontWeight: '600' },

  title: { fontSize: 26, fontWeight: '700', color: CHARCOAL, letterSpacing: -0.3, marginBottom: 4 },
  subtitle: { fontSize: 13, color: CHARCOAL, opacity: 0.4, lineHeight: 18, marginBottom: 20 },

  // Now playing
  nowPlaying: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: SURFACE, borderRadius: 14, padding: 14,
    marginBottom: 12, borderLeftWidth: 4,
  },
  nowPlayingIcon: { fontSize: 28 },
  nowPlayingLabel: { fontSize: 13, fontWeight: '700', color: CHARCOAL, marginBottom: 2 },
  nowPlayingDesc: { fontSize: 11, color: CHARCOAL, opacity: 0.45 },
  playIndicator: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  playIndicatorTxt: { fontSize: 14, color: '#FFFFFF' },

  // Volume
  volumeCard: {
    backgroundColor: SURFACE, borderRadius: 14, padding: 14, marginBottom: 20,
  },
  volumeHeading: { fontSize: 11, fontWeight: '700', color: CHARCOAL, opacity: 0.4, letterSpacing: 0.8, marginBottom: 0 },

  // Grid
  gridLabel: { fontSize: 11, fontWeight: '700', color: CHARCOAL, opacity: 0.35, letterSpacing: 0.8, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },

  // Expo Go notice
  expoGoNotice: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: '#E8DCC866', borderRadius: 12, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: '#E8DCC8',
  },
  expoGoIcon: { fontSize: 16, marginTop: 1 },
  expoGoText: { flex: 1, fontSize: 12, color: CHARCOAL, opacity: 0.6, lineHeight: 18 },

  // Dev banner
  devBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#FFF8E0', borderRadius: 16, padding: 14, marginBottom: 20,
    borderWidth: 1.5, borderColor: '#F0C040',
  },
  devBannerIcon: { fontSize: 22, marginTop: 1 },
  devBannerTitle: { fontSize: 13, fontWeight: '800', color: '#7A5800', marginBottom: 3 },
  devBannerText: { fontSize: 12, color: '#7A5800', opacity: 0.75, lineHeight: 17 },

  // Tip
  tipCard: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: SURFACE, borderRadius: 12, padding: 14, marginTop: 4,
  },
  tipIcon: { fontSize: 16, marginTop: 1 },
  tipText: { flex: 1, fontSize: 12, color: CHARCOAL, opacity: 0.45, lineHeight: 18 },
});
