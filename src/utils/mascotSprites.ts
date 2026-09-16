import { MascotType } from '../types';

/**
 * Mascot Sprite Sheets Generator for page-mascot
 * Provides 3x3 vector sprite sheets for multiple learning companions:
 * 1. owl: Cú Học Giả (Wise Owl)
 * 2. cat: Mèo Chăm Chỉ (Cozy Cat)
 * 3. fox: Cáo Lanh Lợi (Clever Fox)
 * 4. bear: Gấu Ấm Áp (Gentle Bear)
 * 5. bunny: Thỏ Siêu Tốc (Brisk Bunny)
 * 6. robot: Robot AI Tri Thức (Robo-Tutor)
 * 7. shiba: Cún Shiba Năng Lượng (Happy Shiba)
 * 8. penguin: Cánh Cụt Hiếu Học (Smart Penguin)
 * 
 * Grid mapping (3x3):
 * DIRECTIONS:
 *   [0,0] up-left    [1,0] up       [2,0] up-right
 *   [0,1] left       [1,1] center   [2,1] right
 *   [0,2] down-left  [1,2] down     [2,2] down-right
 * 
 * REACTIONS:
 *   [0,0] blink      [1,0] heart    [2,0] sparkle
 *   [0,1] surprised  [1,1] wink     [2,1] bashful
 *   [0,2] sleepy     [1,2] dizzy    [2,2] delighted
 */

export interface MascotInfo {
  id: MascotType;
  name: string;
  title: string;
  tagline: string;
  emoji: string;
  accent: string;
  bgBadge: string;
}

export const MASCOT_LIST: MascotInfo[] = [
  {
    id: 'owl',
    name: 'Cú Học Giả',
    title: 'Cú Trí Tuệ',
    tagline: 'Thông thái, ghi nhớ siêu phàm',
    emoji: '🦉',
    accent: '#059669',
    bgBadge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
  },
  {
    id: 'cat',
    name: 'Mèo Chăm Chỉ',
    title: 'Mèo Ghi Chép',
    tagline: 'Cần mẫn, tỉ mỉ từng bài học',
    emoji: '🐱',
    accent: '#f97316',
    bgBadge: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30'
  },
  {
    id: 'fox',
    name: 'Cáo Lanh Lợi',
    title: 'Cáo Tri Thức',
    tagline: 'Nhạy bén, phân tích lỗi sai siêu đỉnh',
    emoji: '🦊',
    accent: '#ea580c',
    bgBadge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
  },
  {
    id: 'bear',
    name: 'Gấu Ấm Áp',
    title: 'Gấu Kiên Trì',
    tagline: 'Điềm tĩnh, đồng hành vượt khó',
    emoji: '🐻',
    accent: '#92400e',
    bgBadge: 'bg-yellow-600/15 text-yellow-700 dark:text-yellow-400 border-yellow-600/30'
  },
  {
    id: 'bunny',
    name: 'Thỏ Siêu Tốc',
    title: 'Thỏ Nhanh Nhẹn',
    tagline: 'Nhanh như chớp, phản xạ tức thì',
    emoji: '🐰',
    accent: '#ec4899',
    bgBadge: 'bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30'
  },
  {
    id: 'robot',
    name: 'Robot AI Tri Thức',
    title: 'Robo-Tutor 4.0',
    tagline: 'Trí tuệ nhân tạo, tối ưu lộ trình',
    emoji: '🤖',
    accent: '#0284c7',
    bgBadge: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30'
  },
  {
    id: 'shiba',
    name: 'Cún Shiba Vui Vẻ',
    title: 'Shiba Năng Lượng',
    tagline: 'Truyền lửa học tập, xua tan áp lực',
    emoji: '🐕',
    accent: '#d97706',
    bgBadge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
  },
  {
    id: 'penguin',
    name: 'Cánh Cụt Hiếu Học',
    title: 'Penguin Tinh Anh',
    tagline: 'Kỷ luật thép, ngày nào cũng tiến bộ',
    emoji: '🐧',
    accent: '#3b82f6',
    bgBadge: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
  }
];

function generateMascotCell(
  cx: number, 
  cy: number, 
  type: 'direction' | 'reaction', 
  state: string,
  mascot: MascotType
): string {
  let base = '';
  let eyeLeftCx = cx - 12;
  let eyeRightCx = cx + 12;
  let eyeCy = cy + 2;
  let eyeRadius = 10;
  let pupilRadius = 5.5;

  // 1. Base Geometry for each Mascot
  switch (mascot) {
    case 'owl':
      base = `
        <path d="M ${cx - 24} ${cy - 22} L ${cx - 34} ${cy - 38} L ${cx - 14} ${cy - 28} Z" fill="#047857" />
        <path d="M ${cx + 24} ${cy - 22} L ${cx + 34} ${cy - 38} L ${cx + 14} ${cy - 28} Z" fill="#047857" />
        <ellipse cx="${cx}" cy="${cy}" rx="36" ry="34" fill="#10b981" />
        <ellipse cx="${cx}" cy="${cy + 6}" rx="28" ry="24" fill="#ecfdf5" />
        <polygon points="${cx},${cy - 38} ${cx + 24},${cy - 30} ${cx},${cy - 22} ${cx - 24},${cy - 30}" fill="#0f172a" />
        <rect x="${cx - 8}" y="${cy - 25}" width="16" height="6" rx="2" fill="#1e293b" />
        <circle cx="${cx}" cy="${cy - 30}" r="2.5" fill="#f59e0b" />
        <path d="M ${cx} ${cy - 30} Q ${cx + 18} ${cy - 28} ${cx + 20} ${cy - 16}" stroke="#f59e0b" stroke-width="2" fill="none" />
        <circle cx="${cx + 20}" cy="${cy - 16}" r="2" fill="#f59e0b" />
        <ellipse cx="${cx - 20}" cy="${cy + 12}" rx="5" ry="3" fill="#f43f5e" opacity="0.35" />
        <ellipse cx="${cx + 20}" cy="${cy + 12}" rx="5" ry="3" fill="#f43f5e" opacity="0.35" />
        <polygon points="${cx},${cy + 14} ${cx - 5},${cy + 7} ${cx + 5},${cy + 7}" fill="#f59e0b" />
      `;
      break;

    case 'cat':
      base = `
        <!-- Cat Ears -->
        <polygon points="${cx - 28},${cy - 18} ${cx - 36},${cy - 42} ${cx - 12},${cy - 28}" fill="#f97316" />
        <polygon points="${cx - 26},${cy - 20} ${cx - 32},${cy - 38} ${cx - 15},${cy - 27}" fill="#fda4af" />
        <polygon points="${cx + 28},${cy - 18} ${cx + 36},${cy - 42} ${cx + 12},${cy - 28}" fill="#f97316" />
        <polygon points="${cx + 26},${cy - 20} ${cx + 32},${cy - 38} ${cx + 15},${cy - 27}" fill="#fda4af" />
        <!-- Head -->
        <ellipse cx="${cx}" cy="${cy}" rx="36" ry="33" fill="#fb923c" />
        <ellipse cx="${cx}" cy="${cy + 8}" rx="27" ry="22" fill="#fff7ed" />
        <!-- Whiskers -->
        <path d="M ${cx - 24} ${cy + 8} L ${cx - 40} ${cy + 6} M ${cx - 24} ${cy + 12} L ${cx - 40} ${cy + 14}" stroke="#ea580c" stroke-width="1.5" stroke-linecap="round" />
        <path d="M ${cx + 24} ${cy + 8} L ${cx + 40} ${cy + 6} M ${cx + 24} ${cy + 12} L ${cx + 40} ${cy + 14}" stroke="#ea580c" stroke-width="1.5" stroke-linecap="round" />
        <!-- Collar & Bell -->
        <path d="M ${cx - 20} ${cy + 30} Q ${cx} ${cy + 36} ${cx + 20} ${cy + 30}" stroke="#ef4444" stroke-width="4" stroke-linecap="round" fill="none" />
        <circle cx="${cx}" cy="${cy + 35}" r="4" fill="#fbbf24" stroke="#d97706" stroke-width="1" />
        <!-- Nose & Mouth -->
        <polygon points="${cx},${cy + 10} ${cx - 3},${cy + 7} ${cx + 3},${cy + 7}" fill="#f43f5e" />
        <path d="M ${cx - 5} ${cy + 14} Q ${cx - 2.5} ${cy + 12} ${cx} ${cy + 10} Q ${cx + 2.5} ${cy + 12} ${cx + 5} ${cy + 14}" stroke="#c2410c" stroke-width="1.5" fill="none" stroke-linecap="round" />
        <ellipse cx="${cx - 20}" cy="${cy + 10}" rx="5" ry="3" fill="#fda4af" opacity="0.5" />
        <ellipse cx="${cx + 20}" cy="${cy + 10}" rx="5" ry="3" fill="#fda4af" opacity="0.5" />
      `;
      break;

    case 'fox':
      base = `
        <!-- Fox Ears -->
        <polygon points="${cx - 28},${cy - 16} ${cx - 38},${cy - 44} ${cx - 10},${cy - 28}" fill="#c2410c" />
        <polygon points="${cx - 32},${cy - 36} ${cx - 38},${cy - 44} ${cx - 24},${cy - 32}" fill="#0f172a" />
        <polygon points="${cx - 24},${cy - 18} ${cx - 30},${cy - 34} ${cx - 14},${cy - 26}" fill="#ffedd5" />
        <polygon points="${cx + 28},${cy - 16} ${cx + 38},${cy - 44} ${cx + 10},${cy - 28}" fill="#c2410c" />
        <polygon points="${cx + 32},${cy - 36} ${cx + 38},${cy - 44} ${cx + 24},${cy - 32}" fill="#0f172a" />
        <polygon points="${cx + 24},${cy - 18} ${cx + 30},${cy - 34} ${cx + 14},${cy - 26}" fill="#ffedd5" />
        <!-- Head -->
        <ellipse cx="${cx}" cy="${cy}" rx="36" ry="32" fill="#ea580c" />
        <!-- White cheeks & muzzle -->
        <path d="M ${cx - 36} ${cy + 2} Q ${cx - 15} ${cy + 20} ${cx} ${cy + 15} Q ${cx + 15} ${cy + 20} ${cx + 36} ${cy + 2} Q ${cx + 15} ${cy + 34} ${cx} ${cy + 34} Q ${cx - 15} ${cy + 34} ${cx - 36} ${cy + 2} Z" fill="#ffffff" />
        <!-- Round Glasses for scholar fox -->
        <circle cx="${cx - 12}" cy="${cy + 2}" r="12" fill="none" stroke="#f59e0b" stroke-width="2" />
        <circle cx="${cx + 12}" cy="${cy + 2}" r="12" fill="none" stroke="#f59e0b" stroke-width="2" />
        <line x1="${cx - 2}" y1="${cy + 2}" x2="${cx + 2}" y2="${cy + 2}" stroke="#f59e0b" stroke-width="2" />
        <!-- Nose -->
        <polygon points="${cx},${cy + 16} ${cx - 4},${cy + 11} ${cx + 4},${cy + 11}" fill="#0f172a" />
      `;
      break;

    case 'bear':
      base = `
        <!-- Bear Ears -->
        <circle cx="${cx - 28}" cy="${cy - 24}" r="12" fill="#78350f" />
        <circle cx="${cx - 28}" cy="${cy - 24}" r="7" fill="#fed7aa" />
        <circle cx="${cx + 28}" cy="${cy - 24}" r="12" fill="#78350f" />
        <circle cx="${cx + 28}" cy="${cy - 24}" r="7" fill="#fed7aa" />
        <!-- Head -->
        <ellipse cx="${cx}" cy="${cy}" rx="36" ry="34" fill="#92400e" />
        <!-- Snout -->
        <ellipse cx="${cx}" cy="${cy + 12}" rx="18" ry="14" fill="#fed7aa" />
        <ellipse cx="${cx}" cy="${cy + 7}" rx="6" ry="4" fill="#1e1b4b" />
        <path d="M ${cx - 4} ${cy + 15} Q ${cx} ${cy + 18} ${cx + 4} ${cy + 15}" stroke="#78350f" stroke-width="2" fill="none" stroke-linecap="round" />
        <!-- Scholar Beret Hat -->
        <ellipse cx="${cx - 8}" cy="${cy - 28}" rx="22" ry="10" fill="#2563eb" />
        <circle cx="${cx - 8}" cy="${cy - 34}" r="3" fill="#f59e0b" />
        <ellipse cx="${cx - 22}" cy="${cy + 12}" rx="5" ry="3" fill="#f43f5e" opacity="0.3" />
        <ellipse cx="${cx + 22}" cy="${cy + 12}" rx="5" ry="3" fill="#f43f5e" opacity="0.3" />
      `;
      break;

    case 'bunny':
      base = `
        <!-- Bunny Tall Ears -->
        <ellipse cx="${cx - 16}" cy="${cy - 34}" rx="10" ry="24" fill="#ffffff" stroke="#fbcfe8" stroke-width="1.5" />
        <ellipse cx="${cx - 16}" cy="${cy - 34}" rx="6" ry="18" fill="#f472b6" opacity="0.6" />
        <ellipse cx="${cx + 16}" cy="${cy - 34}" rx="10" ry="24" fill="#ffffff" stroke="#fbcfe8" stroke-width="1.5" />
        <ellipse cx="${cx + 16}" cy="${cy - 34}" rx="6" ry="18" fill="#f472b6" opacity="0.6" />
        <!-- Head -->
        <ellipse cx="${cx}" cy="${cy}" rx="35" ry="32" fill="#ffffff" stroke="#fbcfe8" stroke-width="1" />
        <!-- Rosy Cheeks -->
        <ellipse cx="${cx - 20}" cy="${cy + 8}" rx="6" ry="4" fill="#fb7185" opacity="0.45" />
        <ellipse cx="${cx + 20}" cy="${cy + 8}" rx="6" ry="4" fill="#fb7185" opacity="0.45" />
        <!-- Nose & Whiskers -->
        <polygon points="${cx},${cy + 9} ${cx - 3.5},${cy + 5} ${cx + 3.5},${cy + 5}" fill="#f43f5e" />
        <path d="M ${cx - 4} ${cy + 13} Q ${cx - 2} ${cy + 11} ${cx} ${cy + 9} Q ${cx + 2} ${cy + 11} ${cx + 4} ${cy + 13}" stroke="#fb7185" stroke-width="1.5" fill="none" stroke-linecap="round" />
        <!-- Tiny Flower / Carrot Pin -->
        <circle cx="${cx + 22}" cy="${cy - 18}" r="5" fill="#fbbf24" />
        <circle cx="${cx + 22}" cy="${cy - 18}" r="2" fill="#f97316" />
      `;
      break;

    case 'robot':
      base = `
        <!-- Robot Antenna -->
        <line x1="${cx}" y1="${cy - 30}" x2="${cx}" y2="${cy - 44}" stroke="#0284c7" stroke-width="3" stroke-linecap="round" />
        <circle cx="${cx}" cy="${cy - 44}" r="5" fill="#38bdf8" />
        <circle cx="${cx}" cy="${cy - 44}" r="2" fill="#ffffff" />
        <!-- Robot Head Frame -->
        <rect x="${cx - 34}" y="${cy - 30}" width="68" height="60" rx="14" fill="#0f172a" stroke="#0284c7" stroke-width="2.5" />
        <!-- Ear bolts -->
        <rect x="${cx - 40}" y="${cy - 8}" width="6" height="16" rx="2" fill="#38bdf8" />
        <rect x="${cx + 34}" y="${cy - 8}" width="6" height="16" rx="2" fill="#38bdf8" />
        <!-- Inner Digital Visor Screen -->
        <rect x="${cx - 28}" y="${cy - 18}" width="56" height="38" rx="8" fill="#0369a1" opacity="0.3" />
        <!-- Speaker mouth -->
        <rect x="${cx - 12}" y="${cy + 14}" width="24" height="4" rx="2" fill="#38bdf8" />
      `;
      break;

    case 'shiba':
      base = `
        <!-- Shiba Ears -->
        <polygon points="${cx - 28},${cy - 16} ${cx - 36},${cy - 42} ${cx - 10},${cy - 26}" fill="#d97706" />
        <polygon points="${cx - 25},${cy - 18} ${cx - 31},${cy - 37} ${cx - 13},${cy - 25}" fill="#fef3c7" />
        <polygon points="${cx + 28},${cy - 16} ${cx + 36},${cy - 42} ${cx + 10},${cy - 26}" fill="#d97706" />
        <polygon points="${cx + 25},${cy - 18} ${cx + 31},${cy - 37} ${cx + 13},${cy - 25}" fill="#fef3c7" />
        <!-- Head -->
        <ellipse cx="${cx}" cy="${cy}" rx="36" ry="33" fill="#f59e0b" />
        <!-- White Shiba Cheek Patches -->
        <path d="M ${cx - 36} ${cy + 6} Q ${cx - 16} ${cy + 18} ${cx} ${cy + 10} Q ${cx + 16} ${cy + 18} ${cx + 36} ${cy + 6} Q ${cx + 20} ${cy + 34} ${cx} ${cy + 34} Q ${cx - 20} ${cy + 34} ${cx - 36} ${cy + 6} Z" fill="#ffffff" />
        <!-- White Eyebrow Dots -->
        <ellipse cx="${cx - 14}" cy="${cy - 14}" rx="4" ry="3" fill="#ffffff" />
        <ellipse cx="${cx + 14}" cy="${cy - 14}" rx="4" ry="3" fill="#ffffff" />
        <!-- Red Bandana Scarf -->
        <polygon points="${cx - 22},${cy + 28} ${cx + 22},${cy + 28} ${cx},${cy + 40}" fill="#ef4444" />
        <circle cx="${cx}" cy="${cy + 30}" r="2" fill="#ffffff" />
        <!-- Nose -->
        <polygon points="${cx},${cy + 12} ${cx - 4},${cy + 8} ${cx + 4},${cy + 8}" fill="#1e1b4b" />
      `;
      break;

    case 'penguin':
      base = `
        <!-- Penguin Head & Body -->
        <ellipse cx="${cx}" cy="${cy}" rx="36" ry="36" fill="#0f172a" />
        <!-- White Oval Face Mask -->
        <ellipse cx="${cx}" cy="${cy + 6}" rx="26" ry="24" fill="#f8fafc" />
        <!-- Winter Beanie Hat -->
        <path d="M ${cx - 30} ${cy - 18} Q ${cx} ${cy - 44} ${cx + 30} ${cy - 18} Z" fill="#e11d48" />
        <rect x="${cx - 32}" y="${cy - 20}" width="64" height="8" rx="4" fill="#fbbf24" />
        <circle cx="${cx}" cy="${cy - 38}" r="5" fill="#fbbf24" />
        <!-- Beak -->
        <polygon points="${cx},${cy + 14} ${cx - 7},${cy + 6} ${cx + 7},${cy + 6}" fill="#f97316" />
        <!-- Golden Bowtie -->
        <polygon points="${cx - 10},${cy + 28} ${cx + 10},${cy + 28} ${cx},${cy + 33}" fill="#f59e0b" />
        <polygon points="${cx - 10},${cy + 38} ${cx + 10},${cy + 38} ${cx},${cy + 33}" fill="#f59e0b" />
        <circle cx="${cx}" cy="${cy + 33}" r="2.5" fill="#d97706" />
      `;
      break;
  }

  // 2. Eye & Reaction Overrides
  if (type === 'direction') {
    let eyeOffsetX = 0;
    let eyeOffsetY = 0;
    switch (state) {
      case 'up-left': eyeOffsetX = -5; eyeOffsetY = -5; break;
      case 'up': eyeOffsetX = 0; eyeOffsetY = -6; break;
      case 'up-right': eyeOffsetX = 5; eyeOffsetY = -5; break;
      case 'left': eyeOffsetX = -6; eyeOffsetY = 0; break;
      case 'center': eyeOffsetX = 0; eyeOffsetY = 0; break;
      case 'right': eyeOffsetX = 6; eyeOffsetY = 0; break;
      case 'down-left': eyeOffsetX = -5; eyeOffsetY = 5; break;
      case 'down': eyeOffsetX = 0; eyeOffsetY = 6; break;
      case 'down-right': eyeOffsetX = 5; eyeOffsetY = 5; break;
    }

    if (mascot === 'robot') {
      // Robot Glowing LED eyes
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

    return `
      <g id="cell-${mascot}-${state}">
        ${base}
        <circle cx="${eyeLeftCx}" cy="${eyeCy}" r="${eyeRadius}" fill="#ffffff" stroke="#334155" stroke-width="1.5" />
        <circle cx="${eyeLeftCx + eyeOffsetX}" cy="${eyeCy + eyeOffsetY}" r="${pupilRadius}" fill="#0f172a" />
        <circle cx="${eyeLeftCx - 2 + eyeOffsetX}" cy="${eyeCy - 2 + eyeOffsetY}" r="2" fill="#ffffff" />
        <circle cx="${eyeRightCx}" cy="${eyeCy}" r="${eyeRadius}" fill="#ffffff" stroke="#334155" stroke-width="1.5" />
        <circle cx="${eyeRightCx + eyeOffsetX}" cy="${eyeCy + eyeOffsetY}" r="${pupilRadius}" fill="#0f172a" />
        <circle cx="${eyeRightCx - 2 + eyeOffsetX}" cy="${eyeCy - 2 + eyeOffsetY}" r="2" fill="#ffffff" />
      </g>
    `;
  } else {
    // Reactions
    let eyeContent = '';
    let extraDecor = '';

    switch (state) {
      case 'blink':
        eyeContent = `
          <path d="M ${eyeLeftCx - 7} ${eyeCy + 2} Q ${eyeLeftCx} ${eyeCy - 6} ${eyeLeftCx + 7} ${eyeCy + 2}" stroke="#0f172a" stroke-width="3" stroke-linecap="round" fill="none" />
          <path d="M ${eyeRightCx - 7} ${eyeCy + 2} Q ${eyeRightCx} ${eyeCy - 6} ${eyeRightCx + 7} ${eyeCy + 2}" stroke="#0f172a" stroke-width="3" stroke-linecap="round" fill="none" />
        `;
        break;

      case 'heart':
        eyeContent = `
          <path d="M ${eyeLeftCx} ${eyeCy + 5} C ${eyeLeftCx} ${eyeCy + 5} ${eyeLeftCx - 8} ${eyeCy - 2} ${eyeLeftCx - 8} ${eyeCy - 5} C ${eyeLeftCx - 8} ${eyeCy - 9} ${eyeLeftCx - 2} ${eyeCy - 9} ${eyeLeftCx} ${eyeCy - 4} C ${eyeLeftCx + 2} ${eyeCy - 9} ${eyeLeftCx + 8} ${eyeCy - 9} ${eyeLeftCx + 8} ${eyeCy - 5} C ${eyeLeftCx + 8} ${eyeCy - 2} ${eyeLeftCx} ${eyeCy + 5} Z" fill="#e11d48" />
          <path d="M ${eyeRightCx} ${eyeCy + 5} C ${eyeRightCx} ${eyeCy + 5} ${eyeRightCx - 8} ${eyeCy - 2} ${eyeRightCx - 8} ${eyeCy - 5} C ${eyeRightCx - 8} ${eyeCy - 9} ${eyeRightCx - 2} ${eyeCy - 9} ${eyeRightCx} ${eyeCy - 4} C ${eyeRightCx + 2} ${eyeCy - 9} ${eyeRightCx + 8} ${eyeCy - 9} ${eyeRightCx + 8} ${eyeCy - 5} C ${eyeRightCx + 8} ${eyeCy - 2} ${eyeRightCx} ${eyeCy + 5} Z" fill="#e11d48" />
        `;
        extraDecor = `<text x="${cx + 22}" y="${cy - 12}" font-size="12" fill="#f43f5e">♥</text>`;
        break;

      case 'sparkle':
        eyeContent = `
          <path d="M ${eyeLeftCx} ${eyeCy - 7} Q ${eyeLeftCx} ${eyeCy} ${eyeLeftCx + 7} ${eyeCy} Q ${eyeLeftCx} ${eyeCy} ${eyeLeftCx} ${eyeCy + 7} Q ${eyeLeftCx} ${eyeCy} ${eyeLeftCx - 7} ${eyeCy} Q ${eyeLeftCx} ${eyeCy} ${eyeLeftCx} ${eyeCy - 7} Z" fill="#f59e0b" />
          <path d="M ${eyeRightCx} ${eyeCy - 7} Q ${eyeRightCx} ${eyeCy} ${eyeRightCx + 7} ${eyeCy} Q ${eyeRightCx} ${eyeCy} ${eyeRightCx} ${eyeCy + 7} Q ${eyeRightCx} ${eyeCy} ${eyeRightCx - 7} ${eyeCy} Q ${eyeRightCx} ${eyeCy} ${eyeRightCx} ${eyeCy - 7} Z" fill="#f59e0b" />
        `;
        extraDecor = `<text x="${cx - 30}" y="${cy - 14}" font-size="10" fill="#f59e0b">✦</text><text x="${cx + 22}" y="${cy - 12}" font-size="10" fill="#f59e0b">✦</text>`;
        break;

      case 'surprised':
        eyeContent = `
          <circle cx="${eyeLeftCx}" cy="${eyeCy}" r="11" fill="#ffffff" stroke="#334155" stroke-width="1.5" />
          <circle cx="${eyeLeftCx}" cy="${eyeCy}" r="5.5" fill="#0f172a" />
          <circle cx="${eyeRightCx}" cy="${eyeCy}" r="11" fill="#ffffff" stroke="#334155" stroke-width="1.5" />
          <circle cx="${eyeRightCx}" cy="${eyeCy}" r="5.5" fill="#0f172a" />
          <ellipse cx="${cx}" cy="${cy + 18}" rx="4" ry="6" fill="#e11d48" />
        `;
        break;

      case 'wink':
        eyeContent = `
          <path d="M ${eyeLeftCx - 6} ${eyeCy} L ${eyeLeftCx + 6} ${eyeCy}" stroke="#0f172a" stroke-width="3" stroke-linecap="round" />
          <circle cx="${eyeRightCx}" cy="${eyeCy}" r="10" fill="#ffffff" stroke="#334155" stroke-width="1.5" />
          <circle cx="${eyeRightCx}" cy="${eyeCy}" r="5.5" fill="#0f172a" />
          <circle cx="${eyeRightCx - 2}" cy="${eyeCy - 2}" r="2" fill="#ffffff" />
        `;
        extraDecor = `<text x="${cx - 28}" y="${cy}" font-size="12" fill="#f59e0b">★</text>`;
        break;

      case 'bashful':
        eyeContent = `
          <circle cx="${eyeLeftCx}" cy="${eyeCy}" r="9" fill="#ffffff" stroke="#334155" stroke-width="1.5" />
          <circle cx="${eyeLeftCx - 3}" cy="${eyeCy + 2}" r="5" fill="#0f172a" />
          <circle cx="${eyeRightCx}" cy="${eyeCy}" r="9" fill="#ffffff" stroke="#334155" stroke-width="1.5" />
          <circle cx="${eyeRightCx - 3}" cy="${eyeCy + 2}" r="5" fill="#0f172a" />
        `;
        extraDecor = `
          <ellipse cx="${cx - 20}" cy="${cy + 12}" rx="7" ry="4" fill="#f43f5e" opacity="0.6" />
          <ellipse cx="${cx + 20}" cy="${cy + 12}" rx="7" ry="4" fill="#f43f5e" opacity="0.6" />
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
          <circle cx="${eyeLeftCx}" cy="${eyeCy}" r="10" fill="#ffffff" stroke="#334155" stroke-width="1.5" />
          <path d="M ${eyeLeftCx} ${eyeCy} m -2,-2 a 2,2 0 1,1 4,4 a 4,4 0 1,1 -7,-7 a 7,7 0 1,1 11,11" stroke="#6366f1" stroke-width="2" fill="none" stroke-linecap="round" />
          <circle cx="${eyeRightCx}" cy="${eyeCy}" r="10" fill="#ffffff" stroke="#334155" stroke-width="1.5" />
          <path d="M ${eyeRightCx} ${eyeCy} m -2,-2 a 2,2 0 1,1 4,4 a 4,4 0 1,1 -7,-7 a 7,7 0 1,1 11,11" stroke="#6366f1" stroke-width="2" fill="none" stroke-linecap="round" />
        `;
        extraDecor = `
          <text x="${cx - 26}" y="${cy - 14}" font-size="12" fill="#6366f1">@</text>
          <text x="${cx + 22}" y="${cy - 14}" font-size="12" fill="#6366f1">@</text>
        `;
        break;

      case 'delighted':
        eyeContent = `
          <path d="M ${eyeLeftCx - 6} ${eyeCy + 4} Q ${eyeLeftCx} ${eyeCy - 4} ${eyeLeftCx + 6} ${eyeCy + 4}" stroke="#0f172a" stroke-width="3" stroke-linecap="round" fill="none" />
          <path d="M ${eyeRightCx - 6} ${eyeCy + 4} Q ${eyeRightCx} ${eyeCy - 4} ${eyeRightCx + 6} ${eyeCy + 4}" stroke="#0f172a" stroke-width="3" stroke-linecap="round" fill="none" />
          <path d="M ${cx - 6} ${cy + 13} Q ${cx} ${cy + 22} ${cx + 6} ${cy + 13} Z" fill="#e11d48" />
        `;
        extraDecor = `
          <text x="${cx + 22}" y="${cy - 12}" font-size="12" fill="#10b981">♪</text>
          <text x="${cx - 28}" y="${cy - 10}" font-size="10" fill="#f59e0b">✨</text>
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

// Memory Cache for Data URIs
const cacheDirections: Partial<Record<MascotType, string>> = {};
const cacheReactions: Partial<Record<MascotType, string>> = {};

export function getMascotDirectionsUri(mascot: MascotType = 'owl'): string {
  const key = mascot || 'owl';
  if (!cacheDirections[key]) {
    cacheDirections[key] = `data:image/svg+xml;utf8,${encodeURIComponent(buildMascotDirectionsSvg(key))}`;
  }
  return cacheDirections[key]!;
}

export function getMascotReactionsUri(mascot: MascotType = 'owl'): string {
  const key = mascot || 'owl';
  if (!cacheReactions[key]) {
    cacheReactions[key] = `data:image/svg+xml;utf8,${encodeURIComponent(buildMascotReactionsSvg(key))}`;
  }
  return cacheReactions[key]!;
}

// Backward-compatibility exports
export const buildDirectionsSvg = () => buildMascotDirectionsSvg('owl');
export const buildReactionsSvg = () => buildMascotReactionsSvg('owl');
export const MASCOT_DIRECTIONS_DATA_URI = getMascotDirectionsUri('owl');
export const MASCOT_REACTIONS_DATA_URI = getMascotReactionsUri('owl');
