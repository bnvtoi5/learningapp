import { MascotType } from '../types';
import { MASCOT_LIST, MASCOT_CATEGORIES, MascotInfo } from './mascotProfiles';
import { getMascotBaseSvg } from './mascotSVGBases';

export { MASCOT_LIST, MASCOT_CATEGORIES };
export type { MascotInfo };

export function getEffectiveSpriteId(mascot: MascotType): string {
  switch (mascot) {
    // Humans / Anime
    case 'osananajimi':
    case 'student_boy':
    case 'tsundere':
    case 'kuudere':
    case 'headmaster':
    case 'young_ceo':
    case 'oneesan':
    case 'imouto':
    case 'idol':
    case 'maid':
    case 'detective':
    case 'dj_girl':
    case 'streamer':
    case 'yandere':
    case 'gamer':
    case 'ninja':
    case 'mage':
    case 'princess':
    case 'knight':
    case 'vampire':
    case 'demon_lord':
    case 'chuuni':
      return mascot;

    // Mythical / Fantasy
    case 'slime':
    case 'ghost':
    case 'dragon':
    case 'robot':
      return mascot;

    // Single Species Animals
    case 'owl':
    case 'cat':
    case 'fox':
    case 'bear':
    case 'bunny':
    case 'shiba':
    case 'penguin':
    case 'wolf':
    case 'swan':
    case 'lion':
    case 'deer':
    case 'panther':
    case 'villain':
    case 'memegirl':
    case 'chaotic':
    case 'classmate':
      return mascot;

    // Compatibility Aliases
    case 'president':
      return 'young_ceo';
    case 'leader':
      return 'lion';
    case 'queen':
      return 'princess';
    case 'noble':
      return 'deer';
    case 'bestie':
      return 'student_boy';
    case 'hacker':
      return 'robot';

    default:
      return 'osananajimi';
  }
}

function generateMascotCell(
  cx: number, 
  cy: number, 
  type: 'direction' | 'reaction', 
  state: string,
  mascot: MascotType
): string {
  const effectiveSprite = getEffectiveSpriteId(mascot);
  const base = getMascotBaseSvg(effectiveSprite, cx, cy);

  const eyeLeftCx = cx - 12;
  const eyeRightCx = cx + 12;
  const eyeCy = cy + 2;
  const eyeRadius = 9.5;
  const pupilRadius = 5;

  if (type === 'direction') {
    let eyeOffsetX = 0;
    let eyeOffsetY = 0;
    switch (state) {
      case 'up-left': eyeOffsetX = -4.5; eyeOffsetY = -4.5; break;
      case 'up': eyeOffsetX = 0; eyeOffsetY = -5.5; break;
      case 'up-right': eyeOffsetX = 4.5; eyeOffsetY = -4.5; break;
      case 'left': eyeOffsetX = -5.5; eyeOffsetY = 0; break;
      case 'center': eyeOffsetX = 0; eyeOffsetY = 0; break;
      case 'right': eyeOffsetX = 5.5; eyeOffsetY = 0; break;
      case 'down-left': eyeOffsetX = -4.5; eyeOffsetY = 4.5; break;
      case 'down': eyeOffsetX = 0; eyeOffsetY = 5.5; break;
      case 'down-right': eyeOffsetX = 4.5; eyeOffsetY = 4.5; break;
    }

    if (effectiveSprite === 'robot') {
      return `
        <g id="cell-${mascot}-${state}">
          ${base}
          <rect x="${eyeLeftCx - 6 + eyeOffsetX}" y="${eyeCy - 6 + eyeOffsetY}" width="12" height="12" rx="3" fill="#38bdf8" />
          <rect x="${eyeRightCx - 6 + eyeOffsetX}" y="${eyeCy - 6 + eyeOffsetY}" width="12" height="12" rx="3" fill="#38bdf8" />
          <circle cx="${eyeLeftCx + eyeOffsetX}" cy="${eyeCy + eyeOffsetY}" r="2" fill="#ffffff" />
          <circle cx="${eyeRightCx + eyeOffsetX}" cy="${eyeCy + eyeOffsetY}" r="2" fill="#ffffff" />
        </g>
      `;
    }

    // Standard eyes for human and anime characters
    return `
      <g id="cell-${mascot}-${state}">
        ${base}
        <circle cx="${eyeLeftCx}" cy="${eyeCy}" r="${eyeRadius}" fill="#ffffff" stroke="#334155" stroke-width="1.5" />
        <circle cx="${eyeLeftCx + eyeOffsetX}" cy="${eyeCy + eyeOffsetY}" r="${pupilRadius}" fill="#0f172a" />
        <circle cx="${eyeLeftCx - 2 + eyeOffsetX}" cy="${eyeCy - 2 + eyeOffsetY}" r="1.8" fill="#ffffff" />
        <circle cx="${eyeRightCx}" cy="${eyeCy}" r="${eyeRadius}" fill="#ffffff" stroke="#334155" stroke-width="1.5" />
        <circle cx="${eyeRightCx + eyeOffsetX}" cy="${eyeCy + eyeOffsetY}" r="${pupilRadius}" fill="#0f172a" />
        <circle cx="${eyeRightCx - 2 + eyeOffsetX}" cy="${eyeCy - 2 + eyeOffsetY}" r="1.8" fill="#ffffff" />
      </g>
    `;
  } else {
    // Reactions
    let eyeContent = '';
    let extraDecor = '';

    switch (state) {
      case 'blink':
        eyeContent = `
          <path d="M ${eyeLeftCx - 7} ${eyeCy + 2} Q ${eyeLeftCx} ${eyeCy - 6} ${eyeLeftCx + 7} ${eyeCy + 2}" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round" fill="none" />
          <path d="M ${eyeRightCx - 7} ${eyeCy + 2} Q ${eyeRightCx} ${eyeCy - 6} ${eyeRightCx + 7} ${eyeCy + 2}" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round" fill="none" />
        `;
        break;

      case 'heart':
        eyeContent = `
          <path d="M ${eyeLeftCx} ${eyeCy + 5} C ${eyeLeftCx} ${eyeCy + 5} ${eyeLeftCx - 7} ${eyeCy - 2} ${eyeLeftCx - 7} ${eyeCy - 5} C ${eyeLeftCx - 7} ${eyeCy - 9} ${eyeLeftCx - 2} ${eyeCy - 9} ${eyeLeftCx} ${eyeCy - 4} C ${eyeLeftCx + 2} ${eyeCy - 9} ${eyeLeftCx + 7} ${eyeCy - 9} ${eyeLeftCx + 7} ${eyeCy - 5} C ${eyeLeftCx + 7} ${eyeCy - 2} ${eyeLeftCx} ${eyeCy + 5} Z" fill="#e11d48" />
          <path d="M ${eyeRightCx} ${eyeCy + 5} C ${eyeRightCx} ${eyeCy + 5} ${eyeRightCx - 7} ${eyeCy - 2} ${eyeRightCx - 7} ${eyeCy - 5} C ${eyeRightCx - 7} ${eyeCy - 9} ${eyeRightCx - 2} ${eyeCy - 9} ${eyeRightCx} ${eyeCy - 4} C ${eyeRightCx + 2} ${eyeCy - 9} ${eyeRightCx + 7} ${eyeCy - 9} ${eyeRightCx + 7} ${eyeCy - 5} C ${eyeRightCx + 7} ${eyeCy - 2} ${eyeRightCx} ${eyeCy + 5} Z" fill="#e11d48" />
        `;
        extraDecor = `<text x="${cx + 20}" y="${cy - 12}" font-size="12" fill="#f43f5e">♥</text>`;
        break;

      case 'sparkle':
        eyeContent = `
          <path d="M ${eyeLeftCx} ${eyeCy - 6} Q ${eyeLeftCx} ${eyeCy} ${eyeLeftCx + 6} ${eyeCy} Q ${eyeLeftCx} ${eyeCy} ${eyeLeftCx} ${eyeCy + 6} Q ${eyeLeftCx} ${eyeCy} ${eyeLeftCx - 6} ${eyeCy} Q ${eyeLeftCx} ${eyeCy} ${eyeLeftCx} ${eyeCy - 6} Z" fill="#f59e0b" />
          <path d="M ${eyeRightCx} ${eyeCy - 6} Q ${eyeRightCx} ${eyeCy} ${eyeRightCx + 6} ${eyeCy} Q ${eyeRightCx} ${eyeCy} ${eyeRightCx} ${eyeCy + 6} Q ${eyeRightCx} ${eyeCy} ${eyeRightCx - 6} ${eyeCy} Q ${eyeRightCx} ${eyeCy} ${eyeRightCx} ${eyeCy - 6} Z" fill="#f59e0b" />
        `;
        extraDecor = `<text x="${cx - 26}" y="${cy - 12}" font-size="10" fill="#f59e0b">✦</text><text x="${cx + 20}" y="${cy - 10}" font-size="10" fill="#f59e0b">✦</text>`;
        break;

      case 'surprised':
        eyeContent = `
          <circle cx="${eyeLeftCx}" cy="${eyeCy}" r="10" fill="#ffffff" stroke="#334155" stroke-width="1.5" />
          <circle cx="${eyeLeftCx}" cy="${eyeCy}" r="5" fill="#0f172a" />
          <circle cx="${eyeRightCx}" cy="${eyeCy}" r="10" fill="#ffffff" stroke="#334155" stroke-width="1.5" />
          <circle cx="${eyeRightCx}" cy="${eyeCy}" r="5" fill="#0f172a" />
          <ellipse cx="${cx}" cy="${cy + 16}" rx="3.5" ry="5.5" fill="#e11d48" />
        `;
        break;

      case 'wink':
        eyeContent = `
          <path d="M ${eyeLeftCx - 6} ${eyeCy} L ${eyeLeftCx + 6} ${eyeCy}" stroke="#0f172a" stroke-width="3" stroke-linecap="round" />
          <circle cx="${eyeRightCx}" cy="${eyeCy}" r="9.5" fill="#ffffff" stroke="#334155" stroke-width="1.5" />
          <circle cx="${eyeRightCx}" cy="${eyeCy}" r="5" fill="#0f172a" />
          <circle cx="${eyeRightCx - 2}" cy="${eyeCy - 2}" r="1.8" fill="#ffffff" />
        `;
        extraDecor = `<text x="${cx - 24}" y="${cy}" font-size="12" fill="#f59e0b">★</text>`;
        break;

      case 'bashful':
        eyeContent = `
          <circle cx="${eyeLeftCx}" cy="${eyeCy}" r="8.5" fill="#ffffff" stroke="#334155" stroke-width="1.5" />
          <circle cx="${eyeLeftCx - 2}" cy="${eyeCy + 2}" r="4.5" fill="#0f172a" />
          <circle cx="${eyeRightCx}" cy="${eyeCy}" r="8.5" fill="#ffffff" stroke="#334155" stroke-width="1.5" />
          <circle cx="${eyeRightCx - 2}" cy="${eyeCy + 2}" r="4.5" fill="#0f172a" />
        `;
        extraDecor = `
          <ellipse cx="${cx - 18}" cy="${cy + 10}" rx="6" ry="3.5" fill="#f43f5e" opacity="0.6" />
          <ellipse cx="${cx + 18}" cy="${cy + 10}" rx="6" ry="3.5" fill="#f43f5e" opacity="0.6" />
        `;
        break;

      case 'sleepy':
        eyeContent = `
          <path d="M ${eyeLeftCx - 6} ${eyeCy + 2} Q ${eyeLeftCx} ${eyeCy - 1} ${eyeLeftCx + 6} ${eyeCy + 2}" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round" fill="none" />
          <path d="M ${eyeRightCx - 6} ${eyeCy + 2} Q ${eyeRightCx} ${eyeCy - 1} ${eyeRightCx + 6} ${eyeCy + 2}" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round" fill="none" />
        `;
        extraDecor = `
          <text x="${cx + 20}" y="${cy - 12}" font-size="12" font-weight="bold" fill="#64748b">Z</text>
          <text x="${cx + 26}" y="${cy - 20}" font-size="9" font-weight="bold" fill="#94a3b8">z</text>
        `;
        break;

      case 'dizzy':
        eyeContent = `
          <circle cx="${eyeLeftCx}" cy="${eyeCy}" r="9" fill="#ffffff" stroke="#334155" stroke-width="1.5" />
          <path d="M ${eyeLeftCx} ${eyeCy} m -2,-2 a 2,2 0 1,1 4,4 a 4,4 0 1,1 -6,-6 a 6,6 0 1,1 9,9" stroke="#6366f1" stroke-width="1.8" fill="none" stroke-linecap="round" />
          <circle cx="${eyeRightCx}" cy="${eyeCy}" r="9" fill="#ffffff" stroke="#334155" stroke-width="1.5" />
          <path d="M ${eyeRightCx} ${eyeCy} m -2,-2 a 2,2 0 1,1 4,4 a 4,4 0 1,1 -6,-6 a 6,6 0 1,1 9,9" stroke="#6366f1" stroke-width="1.8" fill="none" stroke-linecap="round" />
        `;
        extraDecor = `
          <text x="${cx - 24}" y="${cy - 12}" font-size="11" fill="#6366f1">@</text>
          <text x="${cx + 20}" y="${cy - 12}" font-size="11" fill="#6366f1">@</text>
        `;
        break;

      case 'delighted':
        eyeContent = `
          <path d="M ${eyeLeftCx - 6} ${eyeCy + 3} Q ${eyeLeftCx} ${eyeCy - 4} ${eyeLeftCx + 6} ${eyeCy + 3}" stroke="#0f172a" stroke-width="2.8" stroke-linecap="round" fill="none" />
          <path d="M ${eyeRightCx - 6} ${eyeCy + 3} Q ${eyeRightCx} ${eyeCy - 4} ${eyeRightCx + 6} ${eyeCy + 3}" stroke="#0f172a" stroke-width="2.8" stroke-linecap="round" fill="none" />
          <path d="M ${cx - 5} ${cy + 13} Q ${cx} ${cy + 20} ${cx + 5} ${cy + 13} Z" fill="#e11d48" />
        `;
        extraDecor = `
          <text x="${cx + 20}" y="${cy - 10}" font-size="12" fill="#10b981">♪</text>
          <text x="${cx - 26}" y="${cy - 10}" font-size="10" fill="#f59e0b">✨</text>
        `;
        break;
    }

    return `
      <g id="cell-${mascot}-${state}">
        ${base}
        ${eyeContent}
        ${extraDecor}
      </g>
    `;
  }
}

export function buildMascotDirectionsSvg(mascot: MascotType): string {
  const directionsGrid = [
    ['up-left', 'up', 'up-right'],
    ['left', 'center', 'right'],
    ['down-left', 'down', 'down-right'],
  ];

  let cells = '';
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const cx = c * 100 + 50;
      const cy = r * 100 + 50;
      const dir = directionsGrid[r][c];
      cells += generateMascotCell(cx, cy, 'direction', dir, mascot);
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">${cells}</svg>`;
}

export function buildMascotReactionsSvg(mascot: MascotType): string {
  const reactionsGrid = [
    ['blink', 'heart', 'sparkle'],
    ['surprised', 'wink', 'bashful'],
    ['sleepy', 'dizzy', 'delighted'],
  ];

  let cells = '';
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const cx = c * 100 + 50;
      const cy = r * 100 + 50;
      const react = reactionsGrid[r][c];
      cells += generateMascotCell(cx, cy, 'reaction', react, mascot);
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">${cells}</svg>`;
}

const cacheDirections: Partial<Record<MascotType, string>> = {};
const cacheReactions: Partial<Record<MascotType, string>> = {};

export function getMascotDirectionsUri(mascot: MascotType = 'osananajimi'): string {
  const key = mascot || 'osananajimi';
  if (!cacheDirections[key]) {
    cacheDirections[key] = `data:image/svg+xml;utf8,${encodeURIComponent(buildMascotDirectionsSvg(key))}`;
  }
  return cacheDirections[key]!;
}

export function getMascotReactionsUri(mascot: MascotType = 'osananajimi'): string {
  const key = mascot || 'osananajimi';
  if (!cacheReactions[key]) {
    cacheReactions[key] = `data:image/svg+xml;utf8,${encodeURIComponent(buildMascotReactionsSvg(key))}`;
  }
  return cacheReactions[key]!;
}

export const buildDirectionsSvg = () => buildMascotDirectionsSvg('osananajimi');
export const buildReactionsSvg = () => buildMascotReactionsSvg('osananajimi');
export const MASCOT_DIRECTIONS_DATA_URI = getMascotDirectionsUri('osananajimi');
export const MASCOT_REACTIONS_DATA_URI = getMascotReactionsUri('osananajimi');
