/**
 * Generates all Equi icon assets from the wave brand mark.
 * Run: node scripts/generate-icon.mjs
 *
 * Outputs:
 *   assets/icon.png                    — 1024×1024  iOS + Expo Go
 *   assets/android-icon-foreground.png — 1024×1024  Android adaptive foreground (transparent bg)
 *   assets/android-icon-background.png — 1024×1024  Android adaptive background (sage gradient)
 *   assets/android-icon-monochrome.png — 1024×1024  Android monochrome (white on transparent)
 *   assets/favicon.png                 — 256×256    Web browser tab
 */
import { Resvg } from '@resvg/resvg-js';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Helpers ──────────────────────────────────────────────────────────────

function render(svg, size) {
  const resvg = new Resvg(svg.trim(), { fitTo: { mode: 'width', value: size } });
  return resvg.render().asPng();
}

function write(relPath, buf) {
  const abs = resolve(__dirname, '..', relPath);
  writeFileSync(abs, buf);
  console.log(`✓  ${abs}`);
}

/**
 * Three wave strokes as SVG <path> elements (no enclosing svg tag).
 * amp1/2/3 = amplitudes, cy1/2/3 = centerY of each wave, S = canvas size.
 * strokeColor = colour of the wave lines.
 */
function waveStrokes({ S, cy1, cy2, cy3, amp1, amp2, amp3, strokeColor, periods = 1.5 }) {
  function stroke(amp, cy, width, opacity, glow = false) {
    const q  = S / (periods * 2);
    const cp = 0.372;
    const pts = [`M 0,${cy}`];
    let x = 0; let dir = -1;
    while (x < S) {
      const nx = x + q; const ny = cy + dir * amp;
      pts.push(`C ${x+q*cp},${cy+dir*amp} ${nx-q*cp},${ny} ${nx},${ny}`);
      x = nx; if (x >= S) break;
      const nx2 = x + q;
      pts.push(`C ${x+q*cp},${ny} ${nx2-q*cp},${cy} ${nx2},${cy}`);
      x = nx2; dir *= -1;
    }
    const filter = glow ? 'filter="url(#glow)"' : '';
    return `<path d="${pts.join(' ')}" fill="none" stroke="${strokeColor}"
      stroke-width="${width}" stroke-linecap="round" opacity="${opacity}" ${filter}/>`;
  }
  return `
    ${stroke(amp1, cy1, S * 0.018, 0.20)}
    ${stroke(amp2, cy2, S * 0.020, 0.35)}
    ${stroke(amp3, cy3, S * 0.022, 0.75, true)}
  `;
}

function poolFill({ S, cy, amp, fillId }) {
  const q = S / 4; const cp = 0.372; const y = cy;
  const d = [
    `M 0,${y}`,
    `C ${q*cp},${y-amp} ${q*(1-cp)},${y-amp} ${q},${y}`,
    `C ${q*(1+cp)},${y+amp} ${q*(2-cp)},${y+amp} ${q*2},${y}`,
    `C ${q*(2+cp)},${y-amp} ${q*(3-cp)},${y-amp} ${q*3},${y}`,
    `C ${q*(3+cp)},${y+amp} ${q*(4-cp)},${y+amp} ${S},${y}`,
    `L ${S},${S} L 0,${S} Z`,
  ].join(' ');
  return `<path d="${d}" fill="${fillId}"/>`;
}

const glowFilter = `
  <filter id="glow" x="-10%" y="-60%" width="120%" height="220%">
    <feGaussianBlur stdDeviation="5" result="blur"/>
    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>`;

// ─── 1. icon.png — full-colour on sage background ─────────────────────────

const ICON = 1024;
const iconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${ICON}" height="${ICON}" viewBox="0 0 ${ICON} ${ICON}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#7DAF92"/>
      <stop offset="100%" stop-color="#5A9278"/>
    </linearGradient>
    <linearGradient id="pool" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#4A8065" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#3D7059"/>
    </linearGradient>
    ${glowFilter}
  </defs>
  <rect width="${ICON}" height="${ICON}" fill="url(#bg)"/>
  ${poolFill({ S: ICON, cy: 700, amp: 18, fillId: 'url(#pool)' })}
  ${waveStrokes({ S: ICON, cy1: 510, cy2: 590, cy3: 660, amp1: 110, amp2: 76, amp3: 44, strokeColor: 'white' })}
  <line x1="120" y1="700" x2="${ICON-120}" y2="700" stroke="white" stroke-width="3" stroke-linecap="round" opacity="0.28"/>
</svg>`;

write('assets/icon.png', render(iconSvg, ICON));

// ─── 2. android-icon-foreground.png — waves on transparent bg ─────────────
// Android safe zone = inner 72% of the 1024px canvas = ~738px centred.
// Waves are positioned within that safe zone.

const fgSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${ICON}" height="${ICON}" viewBox="0 0 ${ICON} ${ICON}">
  <defs>
    <linearGradient id="pool2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="white" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="white" stop-opacity="0.22"/>
    </linearGradient>
    ${glowFilter}
  </defs>
  <!-- transparent background — Android composites this over the bg layer -->
  ${poolFill({ S: ICON, cy: 700, amp: 18, fillId: 'url(#pool2)' })}
  ${waveStrokes({ S: ICON, cy1: 510, cy2: 590, cy3: 660, amp1: 110, amp2: 76, amp3: 44, strokeColor: 'white' })}
  <line x1="120" y1="700" x2="${ICON-120}" y2="700" stroke="white" stroke-width="3" stroke-linecap="round" opacity="0.28"/>
</svg>`;

write('assets/android-icon-foreground.png', render(fgSvg, ICON));

// ─── 3. android-icon-background.png — solid sage gradient ────────────────

const bgSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${ICON}" height="${ICON}" viewBox="0 0 ${ICON} ${ICON}">
  <defs>
    <linearGradient id="bg2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#7DAF92"/>
      <stop offset="100%" stop-color="#5A9278"/>
    </linearGradient>
  </defs>
  <rect width="${ICON}" height="${ICON}" fill="url(#bg2)"/>
</svg>`;

write('assets/android-icon-background.png', render(bgSvg, ICON));

// ─── 4. android-icon-monochrome.png — white waves on transparent ──────────
// Used by Android for themed/monochrome icon mode (e.g. wallpaper-tinted icons).

const monoSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${ICON}" height="${ICON}" viewBox="0 0 ${ICON} ${ICON}">
  <defs>
    <linearGradient id="poolM" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="white" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="white" stop-opacity="0.25"/>
    </linearGradient>
    ${glowFilter}
  </defs>
  ${poolFill({ S: ICON, cy: 700, amp: 18, fillId: 'url(#poolM)' })}
  ${waveStrokes({ S: ICON, cy1: 510, cy2: 590, cy3: 660, amp1: 110, amp2: 76, amp3: 44, strokeColor: 'white' })}
  <line x1="120" y1="700" x2="${ICON-120}" y2="700" stroke="white" stroke-width="3" stroke-linecap="round" opacity="0.30"/>
</svg>`;

write('assets/android-icon-monochrome.png', render(monoSvg, ICON));

// ─── 5. favicon.png — simplified for small browser-tab size ──────────────
// Expo web shows this in the browser tab. 256px renders cleanly.

const FAV = 256;
const favSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${FAV}" height="${FAV}" viewBox="0 0 ${FAV} ${FAV}">
  <defs>
    <linearGradient id="fbg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#7DAF92"/>
      <stop offset="100%" stop-color="#5A9278"/>
    </linearGradient>
    <linearGradient id="fpool" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#4A8065" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#3D7059"/>
    </linearGradient>
    ${glowFilter}
  </defs>
  <rect width="${FAV}" height="${FAV}" fill="url(#fbg)"/>
  ${poolFill({ S: FAV, cy: FAV * 0.685, amp: FAV * 0.018, fillId: 'url(#fpool)' })}
  ${waveStrokes({
    S: FAV,
    cy1: FAV * 0.500, cy2: FAV * 0.578, cy3: FAV * 0.645,
    amp1: FAV * 0.107, amp2: FAV * 0.074, amp3: FAV * 0.043,
    strokeColor: 'white',
  })}
  <line x1="${FAV*0.12}" y1="${FAV*0.685}" x2="${FAV*0.88}" y2="${FAV*0.685}"
    stroke="white" stroke-width="2" stroke-linecap="round" opacity="0.28"/>
</svg>`;

write('assets/favicon.png', render(favSvg, FAV));

console.log('\nAll assets generated.');
