import { View, DimensionValue } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
// ThemeProvider overrides the Navigation `Background` component's colors.background
// which is the white view covering the scene — setting it to transparent reveals the scene.
import { ThemeProvider } from '@react-navigation/core';
import { DefaultTheme } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { CrisisModal } from '../../components/ui/CrisisModal';
import { TopBar } from '../../components/ui/TopBar';
import { useAmbientStore, SCENES } from '../../stores/ambient';

const TransparentNavTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: 'transparent' },
};

// Override the default grey background (rgb(242,242,242)) with pure white in normal mode
const WhiteNavTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: '#FFFFFF' },
};

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface TabIconProps {
  name: IoniconsName;
  outlineName: IoniconsName;
  focused: boolean;
  color: string;
}

function TabIcon({ name, outlineName, focused, color }: TabIconProps) {
  return <Ionicons name={focused ? name : outlineName} size={24} color={color} />;
}

// ─── Per-scene base + overlay colors (simulate gradient without native module) ─

function sceneColors(id: string): { base: string; mid: string; bottom: string } {
  switch (id) {
    // More saturated, vivid cartoon palette
    case 'beach':     return { base: '#5BB8E8', mid: '#88CCEE', bottom: '#F0C878' };
    case 'mountains': return { base: '#6AAF72', mid: '#4A8850', bottom: '#1E2A1E' };
    case 'forest':    return { base: '#2A6B3A', mid: '#3D8A50', bottom: '#1A4028' };
    case 'fireplace': return { base: '#0A0400', mid: '#3A1205', bottom: '#D4620A' };
    case 'rain':      return { base: '#1E3C52', mid: '#3A6080', bottom: '#6090B8' };
    case 'nightsky':  return { base: '#020818', mid: '#06142E', bottom: '#0E2248' };
    default:          return { base: '#FFFFFF', mid: '#FFFFFF', bottom: '#FFFFFF' };
  }
}

// ─── Blob shape type ──────────────────────────────────────────────────────────

interface Blob {
  top?: number | string;
  bottom?: number | string;
  left?: DimensionValue;
  right?: number | string;
  w: number;
  h?: number;
  r?: number;
  color: string;
  opacity: number;
  rotate?: string;
}

// ─── Scene cartoon decorations ────────────────────────────────────────────────

const BEACH_BLOBS: Blob[] = [
  // Big bright sun (more saturated, really pops)
  { top: -60, right: -40, w: 190, color: '#FFD000', opacity: 1 },
  { top: -85, right: -65, w: 240, color: '#FFE840', opacity: 0.55 },  // outer glow
  // Bold white clouds
  { top: 90,  left: -25,  w: 170, h: 80,  r: 45, color: '#FFFFFF', opacity: 0.95 },
  { top: 78,  left: 120,  w: 110, h: 60,  r: 35, color: '#FFFFFF', opacity: 0.88 },
  { top: 118, right: -15, w: 140, h: 65,  r: 40, color: '#FFFFFF', opacity: 0.85 },
  { top: 70,  left: 60,   w: 70,  h: 45,  r: 25, color: '#FFFFFF', opacity: 0.75 },
  // Vibrant sand dunes
  { bottom: -20, left: -55, w: 320, h: 160, r: 90, color: '#E8A030', opacity: 0.95 },
  { bottom: 25,  right: -65, w: 260, h: 130, r: 80, color: '#D09020', opacity: 0.85 },
  { bottom: 70,  left: '28%', w: 150, h: 70,  r: 50, color: '#F0B840', opacity: 0.7 },
];

const MOUNTAIN_BLOBS: Blob[] = [
  // Sky clouds
  { top: 28,  left: '5%',  w: 150, h: 65, r: 40, color: '#FFFFFF', opacity: 0.45 },
  { top: 55,  right: '8%', w: 110, h: 50, r: 32, color: '#FFFFFF', opacity: 0.35 },
  // Bold mountain bodies
  { bottom: -90, left: -70,   w: 340, color: '#1A3020', opacity: 1 },
  { bottom: -75, left: '8%',  w: 310, color: '#254030', opacity: 0.98 },
  { bottom: -65, right: -65,  w: 285, color: '#1C2E1C', opacity: 0.95 },
  { bottom: -50, left: '2%',  w: 255, color: '#2E5035', opacity: 0.92 },
  { bottom: -40, right: -25,  w: 235, color: '#224030', opacity: 0.88 },
  // Bold white snow caps
  { bottom: 148, left: -12,   w: 80, h: 42, r: 28, color: '#FFFFFF', opacity: 1 },
  { bottom: 138, left: '24%', w: 65, h: 34, r: 24, color: '#F0F4FF', opacity: 1 },
  { bottom: 130, right: 15,   w: 72, h: 38, r: 26, color: '#FFFFFF', opacity: 0.95 },
];

const FOREST_BLOBS: Blob[] = [
  // Bright sun through canopy
  { top: 25, right: 25, w: 90,  color: '#FFE566', opacity: 0.9 },
  { top: 10, right: 10, w: 125, color: '#FFD93D', opacity: 0.35 },
  // Bold tree canopy
  { top: -35, left: -55,   w: 250, color: '#1A4A28', opacity: 0.98 },
  { top: -20, right: -40,  w: 220, color: '#225232', opacity: 0.95 },
  { top: 8,   left: '18%', w: 190, color: '#2A6838', opacity: 0.9 },
  { top: 48,  left: -35,   w: 180, color: '#183E22', opacity: 0.88 },
  { top: 38,  right: 8,    w: 160, color: '#204E2E', opacity: 0.85 },
  // Ground
  { bottom: -30, left: -20, w: 440, h: 160, r: 0, color: '#0E2818', opacity: 0.98 },
  { bottom: 28,  left: '8%', w: 180, h: 90, r: 55, color: '#163520', opacity: 0.82 },
  // Light shafts — more visible
  { top: 38,  left: '10%',  w: 22, h: 240, r: 11, color: '#FFE566', opacity: 0.18 },
  { top: 18,  left: '38%',  w: 18, h: 220, r: 9,  color: '#FFE566', opacity: 0.14 },
  { top: 55,  right: '12%', w: 20, h: 230, r: 10, color: '#FFE566', opacity: 0.16 },
];

const FIREPLACE_BLOBS: Blob[] = [
  // Dark room
  { top: -65, left: -65,  w: 320, color: '#080300', opacity: 0.9 },
  { top: -55, right: -55, w: 290, color: '#060200', opacity: 0.85 },
  // Wider ember glow
  { bottom: -75, left: '0%', w: 420, h: 480, r: 210, color: '#7B2500', opacity: 0.7 },
  // Bold flame layers
  { bottom: -45, left: '10%', w: 295, h: 420, r: 148, color: '#CC3800', opacity: 0.95 },
  { bottom: -12, left: '16%', w: 248, h: 360, r: 124, color: '#EE5800', opacity: 0.95 },
  { bottom: 12,  left: '20%', w: 205, h: 295, r: 103, color: '#FF7800', opacity: 0.95 },
  { bottom: 38,  left: '25%', w: 158, h: 230, r: 79,  color: '#FFBB22', opacity: 0.95 },
  { bottom: 68,  left: '30%', w: 112, h: 178, r: 56,  color: '#FFD840', opacity: 0.95 },
  { bottom: 98,  left: '35%', w: 72,  h: 128, r: 36,  color: '#FFF080', opacity: 0.92 },
  { bottom: 128, left: '40%', w: 42,  h: 88,  r: 21,  color: '#FFFFFF',  opacity: 0.85 },
  // Sparks
  { bottom: 165, left: '22%', w: 12, color: '#FF8800', opacity: 0.95 },
  { bottom: 182, left: '52%', w: 9,  color: '#FFAA00', opacity: 0.92 },
  { bottom: 158, left: '43%', w: 8,  color: '#FF6600', opacity: 0.88 },
  { bottom: 200, left: '35%', w: 7,  color: '#FFCC00', opacity: 0.8 },
];

// Rain streaks — more visible
const RAIN_STREAKS: Blob[] = Array.from({ length: 28 }, (_, i) => ({
  top: 80 + Math.floor(i / 5) * 50,
  left: `${2 + i * 3.4}%`,
  w: 2,
  h: 45 + (i % 5) * 16,
  r: 1,
  color: '#C8E8FF',
  opacity: 0.35 + (i % 4) * 0.08,
  rotate: '10deg',
}));

const RAIN_BLOBS: Blob[] = [
  // Bold dark cloud masses
  { top: -60, left: -50,    w: 310, h: 150, r: 75, color: '#2A3848', opacity: 0.98 },
  { top: -38, left: '16%',  w: 280, h: 118, r: 59, color: '#223040', opacity: 0.95 },
  { top: -50, right: -40,   w: 240, h: 128, r: 64, color: '#283848', opacity: 0.92 },
  { top: 52,  left: -28,    w: 240, h: 98,  r: 50, color: '#344858', opacity: 0.75 },
  { top: 62,  right: -18,   w: 200, h: 88,  r: 45, color: '#2C4058', opacity: 0.7 },
  ...RAIN_STREAKS,
];

// Stars — more numerous and bright
const STARS: Blob[] = Array.from({ length: 35 }, (_, i) => ({
  top: 20 + (i * 37) % 380,
  left: `${(i * 13 + 3) % 90}%`,
  w: i % 6 === 0 ? 14 : i % 3 === 0 ? 9 : 6,
  r: 999,
  color: i % 5 === 0 ? '#FFE840' : i % 7 === 0 ? '#FFB0C0' : '#FFFFFF',
  opacity: 0.6 + (i % 5) * 0.08,
}));

const NIGHTSKY_BLOBS: Blob[] = [
  // Moon big glow halo
  { top: 22, right: 12,  w: 140, color: '#FFF0A0', opacity: 0.4 },
  // Moon body — bright
  { top: 36, right: 28,  w: 96,  color: '#FFFACC', opacity: 1 },
  // Moon shadow (crescent)
  { top: 24, right: 16,  w: 88,  color: '#030810', opacity: 1 },
  // Atmosphere
  { top: -55, left: -60,    w: 320, color: '#040810', opacity: 0.8 },
  { bottom: -55, right: -55, w: 340, color: '#020608', opacity: 0.7 },
  // Nebula glow
  { top: 300, left: '5%',  w: 180, h: 90, r: 55, color: '#3050C0', opacity: 0.28 },
  { top: 200, right: '8%', w: 140, h: 70, r: 45, color: '#5030A0', opacity: 0.2 },
  ...STARS,
];

const SCENE_BLOBS: Record<string, Blob[]> = {
  beach:     BEACH_BLOBS,
  mountains: MOUNTAIN_BLOBS,
  forest:    FOREST_BLOBS,
  fireplace: FIREPLACE_BLOBS,
  rain:      RAIN_BLOBS,
  nightsky:  NIGHTSKY_BLOBS,
};

// ─── Ambient background component ────────────────────────────────────────────

function AmbientBackground({ sceneId }: { sceneId: string }) {
  const { base, mid, bottom } = sceneColors(sceneId);

  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, overflow: 'hidden' }}
    >
      {/* Base fill */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: base }} />
      {/* Mid-tone overlay (upper 60%) — use height% to avoid bottom% Fabric issue */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '60%', backgroundColor: mid, opacity: 0.55 }} />
      {/* Bottom tone overlay (lower 50%) */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '50%', backgroundColor: bottom, opacity: 0.6 }} />
      {(SCENE_BLOBS[sceneId] ?? []).filter(Boolean).map((b, i) => {
        const blobStyle: Record<string, unknown> = {
          position: 'absolute',
          width:        b.w,
          height:       b.h ?? b.w,
          borderRadius: b.r ?? b.w / 2,
          backgroundColor: b.color,
          opacity:      b.opacity,
        };
        if (b.top    !== undefined) blobStyle.top    = b.top;
        if (b.bottom !== undefined) blobStyle.bottom = b.bottom;
        if (b.left   !== undefined) blobStyle.left   = b.left;
        if (b.right  !== undefined) blobStyle.right  = b.right;
        if (b.rotate)               blobStyle.transform = [{ rotate: b.rotate }];
        return <View key={i} style={blobStyle as never} />;
      })}
    </View>
  );
}

// ─── Tab layout ───────────────────────────────────────────────────────────────

export default function TabLayout() {
  const { activeSceneId } = useAmbientStore();
  const activeScene = SCENES.find(s => s.id === activeSceneId);

  const { base: sceneBg } = activeScene ? sceneColors(activeScene.id) : { base: '#FFFFFF' };
  const accent       = activeScene?.bgFrom ?? Colors.sageGreen;
  // Solid opaque tab bar in scene accent — white icons/labels for max legibility on scene color
  const tabBarBg     = activeScene ? accent : Colors.softWhite;
  const tabBarBorder = activeScene ? accent : Colors.warmSand;

  return (
    <View style={{ flex: 1, backgroundColor: activeScene ? sceneBg : '#FFFFFF' }}>

      {activeScene && <AmbientBackground sceneId={activeScene.id} />}

      <TopBar />

      <ThemeProvider value={activeScene ? TransparentNavTheme : WhiteNavTheme}>
      <Tabs
        sceneContainerStyle={{ backgroundColor: 'transparent' }}
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: tabBarBg,
            borderTopColor: tabBarBorder,
            borderTopWidth: 1,
          },
          // On scene: white active, semi-white inactive — on no scene: accent active, grey inactive
          tabBarActiveTintColor:   activeScene ? '#FFFFFF' : accent,
          tabBarInactiveTintColor: activeScene ? 'rgba(255,255,255,0.50)' : Colors.charcoal + '66',
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Today',
            tabBarIcon: ({ focused, color }) => (
              <TabIcon name="home" outlineName="home-outline" focused={focused} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="journal"
          options={{
            title: 'Journal',
            tabBarIcon: ({ focused, color }) => (
              <TabIcon name="book" outlineName="book-outline" focused={focused} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="tracker"
          options={{
            title: 'Tracker',
            tabBarIcon: ({ focused, color }) => (
              <TabIcon name="pulse" outlineName="pulse-outline" focused={focused} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="activities"
          options={{
            title: 'Activities',
            tabBarIcon: ({ focused, color }) => (
              <TabIcon name="leaf" outlineName="leaf-outline" focused={focused} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: 'Calendar',
            tabBarIcon: ({ focused, color }) => (
              <TabIcon name="calendar" outlineName="calendar-outline" focused={focused} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="you"
          options={{
            href: null,  // hidden from tab bar — accessible via TopBar profile avatar
          }}
        />
      </Tabs>
      </ThemeProvider>

      <CrisisModal />
    </View>
  );
}
