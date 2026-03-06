import { useEffect } from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

function WaveLayer({
  amplitude,
  yOffset,
  duration,
  phaseOffset,
  color,
  topOpacity,
  bottomOpacity,
  svgHeight,
}: {
  amplitude: number;
  yOffset: number;
  duration: number;
  phaseOffset: number;
  color: string;
  topOpacity: number;
  bottomOpacity: number;
  svgHeight: number;
}) {
  const { width } = useWindowDimensions();
  const tileW = width * 2;
  const tx = useSharedValue(phaseOffset);
  const scaleY = useSharedValue(1.5);

  useEffect(() => {
    tx.value = withRepeat(
      withTiming(phaseOffset - width, { duration, easing: Easing.linear }),
      -1,
    );
    scaleY.value = withSequence(
      withTiming(1.0, { duration: 2200, easing: Easing.out(Easing.cubic) }),
      withRepeat(
        withSequence(
          withTiming(1.04, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
          withTiming(1.0, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { scaleY: scaleY.value }],
  }));

  const mid = svgHeight * 0.44;
  const q = tileW / 4;
  const cp = 0.37;
  const y = mid + yOffset;
  const d = [
    `M 0,${y}`,
    `C ${q * cp},${y - amplitude} ${q * (1 - cp)},${y - amplitude} ${q},${y}`,
    `C ${q * (1 + cp)},${y + amplitude} ${q * (2 - cp)},${y + amplitude} ${q * 2},${y}`,
    `C ${q * (2 + cp)},${y - amplitude} ${q * (3 - cp)},${y - amplitude} ${q * 3},${y}`,
    `C ${q * (3 + cp)},${y + amplitude} ${q * (4 - cp)},${y + amplitude} ${tileW},${y}`,
    `L ${tileW},${svgHeight} L 0,${svgHeight} Z`,
  ].join(' ');

  const gradId = `g${amplitude}${yOffset}`;

  return (
    <Animated.View style={[{ position: 'absolute', top: 0, left: 0 }, style]}>
      <Svg width={tileW} height={svgHeight}>
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={String(topOpacity)} />
            <Stop offset="1" stopColor={color} stopOpacity={String(bottomOpacity)} />
          </LinearGradient>
        </Defs>
        <Path d={d} fill={`url(#${gradId})`} />
      </Svg>
    </Animated.View>
  );
}

export default function SplashScreen() {
  const { width } = useWindowDimensions();
  const waveH = 280;

  const logoOpacity = useSharedValue(0);
  const logoY = useSharedValue(18);
  const taglineOpacity = useSharedValue(0);

  useEffect(() => {
    logoOpacity.value = withDelay(
      900,
      withTiming(1, { duration: 650, easing: Easing.out(Easing.quad) }),
    );
    logoY.value = withDelay(
      900,
      withTiming(0, { duration: 650, easing: Easing.out(Easing.quad) }),
    );
    taglineOpacity.value = withDelay(
      1400,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) }),
    );

    const timer = setTimeout(() => router.replace('/(tabs)'), 3800);
    return () => clearTimeout(timer);
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoY.value }],
  }));
  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F3EE', alignItems: 'center', justifyContent: 'center' }}>
      {/* Wave illustration — pinned to top */}
      <View style={{ position: 'absolute', top: 0, width, height: waveH, overflow: 'hidden' }}>
        {/* Back wave — sky blue, most transparent, highest amplitude */}
        <WaveLayer
          amplitude={40} yOffset={-10} duration={6000} phaseOffset={0}
          color="#89B4CC" topOpacity={0.22} bottomOpacity={0.1} svgHeight={waveH}
        />
        {/* Mid wave — sage, medium */}
        <WaveLayer
          amplitude={27} yOffset={6} duration={8500} phaseOffset={-width * 0.3}
          color="#A8C5A0" topOpacity={0.45} bottomOpacity={0.2} svgHeight={waveH}
        />
        {/* Front wave — sage, most opaque, smallest amplitude */}
        <WaveLayer
          amplitude={16} yOffset={18} duration={11000} phaseOffset={-width * 0.6}
          color="#A8C5A0" topOpacity={0.72} bottomOpacity={0.38} svgHeight={waveH}
        />
      </View>

      {/* Logo + tagline */}
      <Animated.View style={[{ alignItems: 'center', marginTop: 80 }, logoStyle]}>
        <Text style={{ fontSize: 68, fontWeight: '700', letterSpacing: -2, color: '#3D3935', lineHeight: 72 }}>
          Equi
        </Text>
        <Animated.Text style={[{ fontSize: 15.5, fontWeight: '400', color: '#3D3935', opacity: 0.5, letterSpacing: 0.4, marginTop: 8 }, taglineStyle]}>
          Finding your equilibrium.
        </Animated.Text>
      </Animated.View>
    </SafeAreaView>
  );
}
