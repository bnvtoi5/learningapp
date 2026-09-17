export function getMascotBaseSvg(effectiveSprite: string, cx: number, cy: number): string {
  switch (effectiveSprite) {
    // ================= DẠNG NGƯỜI / ANIME =================
    case 'osananajimi':
      // Anime Schoolgirl: Brown bangs, twin side ponytails, red sailor ribbon collar
      return `
        <!-- Hair Back -->
        <ellipse cx="${cx - 24}" cy="${cy + 6}" rx="8" ry="14" fill="#6d4c41" />
        <ellipse cx="${cx + 24}" cy="${cy + 6}" rx="8" ry="14" fill="#6d4c41" />
        <!-- Face -->
        <ellipse cx="${cx}" cy="${cy}" rx="30" ry="29" fill="#fff5eb" />
        <!-- Sailor Collar & Bow -->
        <path d="M ${cx - 22} ${cy + 22} Q ${cx} ${cy + 34} ${cx + 22} ${cy + 22} L ${cx + 16} ${cy + 38} L ${cx - 16} ${cy + 38} Z" fill="#2563eb" />
        <polygon points="${cx - 10},${cy + 25} ${cx + 10},${cy + 25} ${cx},${cy + 33}" fill="#ef4444" />
        <polygon points="${cx - 10},${cy + 38} ${cx + 10},${cy + 38} ${cx},${cy + 33}" fill="#ef4444" />
        <!-- Anime Bangs & Hair Front -->
        <path d="M ${cx - 30} ${cy - 4} Q ${cx - 24} ${cy - 28} ${cx} ${cy - 30} Q ${cx + 24} ${cy - 28} ${cx + 30} ${cy - 4} Q ${cx + 20} ${cy - 12} ${cx + 12} ${cy - 6} Q ${cx} ${cy - 16} ${cx - 12} ${cy - 6} Q ${cx - 20} ${cy - 12} ${cx - 30} ${cy - 4} Z" fill="#8d6e63" />
        <!-- Hair Clips -->
        <polygon points="${cx - 25},${cy - 15} ${cx - 17},${cy - 18} ${cx - 16},${cy - 14} ${cx - 24},${cy - 11}" fill="#fbbf24" />
        <polygon points="${cx - 25},${cy - 9} ${cx - 17},${cy - 12} ${cx - 16},${cy - 8} ${cx - 24},${cy - 5}" fill="#f43f5e" />
        <!-- Blushes & Tiny Smile -->
        <ellipse cx="${cx - 18}" cy="${cy + 10}" rx="5" ry="3" fill="#fb7185" opacity="0.5" />
        <ellipse cx="${cx + 18}" cy="${cy + 10}" rx="5" ry="3" fill="#fb7185" opacity="0.5" />
        <path d="M ${cx - 3} ${cy + 12} Q ${cx} ${cy + 15} ${cx + 3} ${cy + 12}" stroke="#be123c" stroke-width="1.5" stroke-linecap="round" fill="none" />
      `;

    case 'student_boy':
      // Anime Boy: Spiky dark navy hair, cool bangs, sporty school hoodie collar
      return `
        <!-- Face -->
        <ellipse cx="${cx}" cy="${cy}" rx="30" ry="29" fill="#fff5eb" />
        <!-- Sporty Hoodie Collar -->
        <path d="M ${cx - 22} ${cy + 22} Q ${cx} ${cy + 34} ${cx + 22} ${cy + 22} L ${cx + 18} ${cy + 40} L ${cx - 18} ${cy + 40} Z" fill="#1e293b" />
        <path d="M ${cx - 8} ${cy + 24} L ${cx - 8} ${cy + 36} M ${cx + 8} ${cy + 24} L ${cx + 8} ${cy + 36}" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" />
        <!-- Spiky Dark Hair -->
        <path d="M ${cx - 30} ${cy - 4} L ${cx - 34} ${cy - 24} L ${cx - 18} ${cy - 34} L ${cx - 4} ${cy - 38} L ${cx + 12} ${cy - 35} L ${cx + 30} ${cy - 26} L ${cx + 30} ${cy - 4} Q ${cx + 18} ${cy - 14} ${cx + 10} ${cy - 8} Q ${cx} ${cy - 18} ${cx - 10} ${cy - 8} Q ${cx - 20} ${cy - 14} ${cx - 30} ${cy - 4} Z" fill="#1e293b" />
        <path d="M ${cx - 2} ${cy - 36} L ${cx + 6} ${cy - 20} L ${cx - 6} ${cy - 12} L ${cx - 2} ${cy - 36}" fill="#334155" />
        <!-- Cheek blush & smile -->
        <ellipse cx="${cx - 18}" cy="${cy + 10}" rx="4" ry="2.5" fill="#f43f5e" opacity="0.3" />
        <ellipse cx="${cx + 18}" cy="${cy + 10}" rx="4" ry="2.5" fill="#f43f5e" opacity="0.3" />
        <path d="M ${cx - 4} ${cy + 12} Q ${cx} ${cy + 16} ${cx + 4} ${cy + 12}" stroke="#334155" stroke-width="1.8" stroke-linecap="round" fill="none" />
      `;

    case 'tsundere':
      // Anime Tsundere Girl: Blonde twintails tied with red ribbons, blushing cheeks
      return `
        <!-- Twintails Back -->
        <path d="M ${cx - 24} ${cy - 16} Q ${cx - 46} ${cy + 2} ${cx - 36} ${cy + 28} Q ${cx - 26} ${cy + 12} ${cx - 22} ${cy - 4} Z" fill="#fbbf24" />
        <path d="M ${cx + 24} ${cy - 16} Q ${cx + 46} ${cy + 2} ${cx + 36} ${cy + 28} Q ${cx + 26} ${cy + 12} ${cx + 22} ${cy - 4} Z" fill="#fbbf24" />
        <!-- Red Ribbons -->
        <circle cx="${cx - 24}" cy="${cy - 14}" r="5" fill="#ef4444" />
        <circle cx="${cx + 24}" cy="${cy - 14}" r="5" fill="#ef4444" />
        <!-- Face -->
        <ellipse cx="${cx}" cy="${cy}" rx="29" ry="28" fill="#fff5eb" />
        <!-- School Blazer & Red Tie -->
        <polygon points="${cx - 20},${cy + 22} ${cx + 20},${cy + 22} ${cx},${cy + 38}" fill="#1e1b4b" />
        <polygon points="${cx - 4},${cy + 24} ${cx + 4},${cy + 24} ${cx},${cy + 36}" fill="#f97316" />
        <!-- Blonde Bangs -->
        <path d="M ${cx - 28} ${cy - 6} Q ${cx - 20} ${cy - 30} ${cx} ${cy - 30} Q ${cx + 20} ${cy - 30} ${cx + 28} ${cy - 6} Q ${cx + 16} ${cy - 14} ${cx + 8} ${cy - 8} Q ${cx} ${cy - 18} ${cx - 8} ${cy - 8} Q ${cx - 18} ${cy - 14} ${cx - 28} ${cy - 6} Z" fill="#fde047" />
        <!-- Deep Blushes & Tsundere Pout -->
        <ellipse cx="${cx - 18}" cy="${cy + 8}" rx="6" ry="3.5" fill="#f43f5e" opacity="0.65" />
        <ellipse cx="${cx + 18}" cy="${cy + 8}" rx="6" ry="3.5" fill="#f43f5e" opacity="0.65" />
        <path d="M ${cx - 4} ${cy + 14} Q ${cx} ${cy + 11} ${cx + 4} ${cy + 14}" stroke="#c2410c" stroke-width="2" stroke-linecap="round" fill="none" />
      `;

    case 'kuudere':
      // Silver hair, sleek bangs, ice cyan scarf
      return `
        <!-- Silver Hair Back -->
        <path d="M ${cx - 26} ${cy - 10} L ${cx - 30} ${cy + 24} L ${cx - 18} ${cy + 26} L ${cx - 18} ${cy - 4} Z" fill="#94a3b8" />
        <path d="M ${cx + 26} ${cy - 10} L ${cx + 30} ${cy + 24} L ${cx + 18} ${cy + 26} L ${cx + 18} ${cy - 4} Z" fill="#94a3b8" />
        <!-- Face -->
        <ellipse cx="${cx}" cy="${cy}" rx="29" ry="28" fill="#f8fafc" />
        <!-- Cyan Knitted Scarf -->
        <path d="M ${cx - 24} ${cy + 18} Q ${cx} ${cy + 30} ${cx + 24} ${cy + 18} L ${cx + 20} ${cy + 38} L ${cx - 20} ${cy + 38} Z" fill="#0284c7" />
        <circle cx="${cx}" cy="${cy + 28}" r="2" fill="#38bdf8" />
        <!-- Silver Straight Bangs -->
        <path d="M ${cx - 28} ${cy - 6} Q ${cx - 16} ${cy - 30} ${cx} ${cy - 30} Q ${cx + 16} ${cy - 30} ${cx + 28} ${cy - 6} L ${cx + 16} ${cy - 8} L ${cx + 6} ${cy - 12} L ${cx} ${cy - 8} L ${cx - 8} ${cy - 12} L ${cx - 18} ${cy - 8} Z" fill="#cbd5e1" />
        <!-- Cyan Snow Pin -->
        <circle cx="${cx + 18}" cy="${cy - 14}" r="3" fill="#38bdf8" />
        <!-- Calm straight line mouth -->
        <line x1="${cx - 3}" y1="${cy + 13}" x2="${cx + 3}" y2="${cy + 13}" stroke="#475569" stroke-width="1.5" stroke-linecap="round" />
      `;

    case 'headmaster':
    case 'sensei':
      // Handsome Sensei: Neat dark hair, gold-rim glasses, navy blazer & tie
      return `
        <!-- Face -->
        <ellipse cx="${cx}" cy="${cy}" rx="30" ry="29" fill="#fff5eb" />
        <!-- Suit Collar & Emerald Tie -->
        <polygon points="${cx - 22},${cy + 22} ${cx + 22},${cy + 22} ${cx},${cy + 40}" fill="#0f172a" />
        <polygon points="${cx - 5},${cy + 24} ${cx + 5},${cy + 24} ${cx},${cy + 38}" fill="#059669" />
        <!-- Neat Black Hair with Side Parting -->
        <path d="M ${cx - 30} ${cy - 4} Q ${cx - 24} ${cy - 32} ${cx} ${cy - 32} Q ${cx + 24} ${cy - 30} ${cx + 30} ${cy - 4} L ${cx + 18} ${cy - 10} L ${cx + 4} ${cy - 16} L ${cx - 10} ${cy - 8} L ${cx - 22} ${cy - 8} Z" fill="#1e293b" />
        <!-- Gold-rim Intellectual Glasses -->
        <circle cx="${cx - 12}" cy="${cy + 2}" r="11" fill="none" stroke="#f59e0b" stroke-width="1.8" />
        <circle cx="${cx + 12}" cy="${cy + 2}" r="11" fill="none" stroke="#f59e0b" stroke-width="1.8" />
        <line x1="${cx - 1}" y1="${cy + 2}" x2="${cx + 1}" y2="${cy + 2}" stroke="#f59e0b" stroke-width="1.8" />
        <!-- Composed Smile -->
        <path d="M ${cx - 3} ${cy + 14} Q ${cx} ${cy + 16} ${cx + 3} ${cy + 14}" stroke="#0f172a" stroke-width="1.5" stroke-linecap="round" fill="none" />
      `;

    case 'young_ceo':
      // Young CEO: Sharp hairstyle, luxury cyan-accented tuxedo & gold pin
      return `
        <!-- Face -->
        <ellipse cx="${cx}" cy="${cy}" rx="30" ry="29" fill="#fff5eb" />
        <!-- Luxury Navy Suit & Cyan Tie -->
        <polygon points="${cx - 22},${cy + 22} ${cx + 22},${cy + 22} ${cx},${cy + 40}" fill="#0f172a" />
        <polygon points="${cx - 5},${cy + 24} ${cx + 5},${cy + 24} ${cx},${cy + 38}" fill="#0284c7" />
        <circle cx="${cx}" cy="${cy + 26}" r="2" fill="#fbbf24" />
        <!-- Sleek Brushed Back Hair -->
        <path d="M ${cx - 30} ${cy - 4} Q ${cx - 24} ${cy - 34} ${cx} ${cy - 34} Q ${cx + 24} ${cy - 34} ${cx + 30} ${cy - 4} L ${cx + 20} ${cy - 14} L ${cx + 8} ${cy - 18} L ${cx - 8} ${cy - 14} L ${cx - 22} ${cy - 8} Z" fill="#334155" />
        <!-- Confident Smile -->
        <path d="M ${cx - 4} ${cy + 13} Q ${cx} ${cy + 16} ${cx + 4} ${cy + 13}" stroke="#0f172a" stroke-width="1.8" stroke-linecap="round" fill="none" />
      `;

    case 'oneesan':
      // Sweet Big Sister: Wavy chestnut hair, elegant pink collar & pearl pendant
      return `
        <!-- Wavy Hair Back -->
        <ellipse cx="${cx - 26}" cy="${cy + 8}" rx="10" ry="18" fill="#78350f" />
        <ellipse cx="${cx + 26}" cy="${cy + 8}" rx="10" ry="18" fill="#78350f" />
        <!-- Face -->
        <ellipse cx="${cx}" cy="${cy}" rx="30" ry="29" fill="#fff5eb" />
        <!-- Pink Blouse & Pearl -->
        <path d="M ${cx - 22} ${cy + 22} Q ${cx} ${cy + 34} ${cx + 22} ${cy + 22} L ${cx + 18} ${cy + 40} L ${cx - 18} ${cy + 40} Z" fill="#ec4899" />
        <circle cx="${cx}" cy="${cy + 30}" r="3" fill="#ffffff" stroke="#f43f5e" stroke-width="1" />
        <!-- Swept Bangs -->
        <path d="M ${cx - 30} ${cy - 6} Q ${cx - 20} ${cy - 30} ${cx} ${cy - 30} Q ${cx + 20} ${cy - 30} ${cx + 30} ${cy - 6} Q ${cx + 14} ${cy - 16} ${cx + 4} ${cy - 8} Q ${cx - 12} ${cy - 14} ${cx - 24} ${cy - 8} Z" fill="#92400e" />
        <!-- Warm blush & gentle smile -->
        <ellipse cx="${cx - 18}" cy="${cy + 9}" rx="5" ry="3" fill="#f43f5e" opacity="0.4" />
        <ellipse cx="${cx + 18}" cy="${cy + 9}" rx="5" ry="3" fill="#f43f5e" opacity="0.4" />
        <path d="M ${cx - 4} ${cy + 13} Q ${cx} ${cy + 16} ${cx + 4} ${cy + 13}" stroke="#be123c" stroke-width="1.8" stroke-linecap="round" fill="none" />
      `;

    case 'imouto':
      // Cute Little Sister: Pink hair with buns, strawberry hair clip
      return `
        <!-- Side Buns -->
        <circle cx="${cx - 26}" cy="${cy - 16}" r="9" fill="#f472b6" />
        <circle cx="${cx + 26}" cy="${cy - 16}" r="9" fill="#f472b6" />
        <!-- Face -->
        <ellipse cx="${cx}" cy="${cy}" rx="29" ry="28" fill="#fff5eb" />
        <!-- Strawberry Collar -->
        <polygon points="${cx - 18},${cy + 22} ${cx + 18},${cy + 22} ${cx},${cy + 36}" fill="#fb7185" />
        <!-- Pink Bangs -->
        <path d="M ${cx - 28} ${cy - 6} Q ${cx - 18} ${cy - 28} ${cx} ${cy - 28} Q ${cx + 18} ${cy - 28} ${cx + 28} ${cy - 6} L ${cx + 16} ${cy - 10} L ${cx + 6} ${cy - 12} L ${cx} ${cy - 8} L ${cx - 10} ${cy - 12} L ${cx - 20} ${cy - 8} Z" fill="#f472b6" />
        <!-- Strawberry Clip -->
        <polygon points="${cx - 20},${cy - 18} ${cx - 16},${cy - 12} ${cx - 24},${cy - 12}" fill="#ef4444" />
        <circle cx="${cx - 20}" cy="${cy - 15}" r="1" fill="#fbbf24" />
        <!-- Rosy Cheeks -->
        <ellipse cx="${cx - 18}" cy="${cy + 8}" rx="6" ry="4" fill="#fb7185" opacity="0.6" />
        <ellipse cx="${cx + 18}" cy="${cy + 8}" rx="6" ry="4" fill="#fb7185" opacity="0.6" />
        <path d="M ${cx - 3} ${cy + 12} Q ${cx} ${cy + 16} ${cx + 3} ${cy + 12}" stroke="#be123c" stroke-width="1.8" stroke-linecap="round" fill="none" />
      `;

    case 'idol':
      // Idol Girl: Twintails, stage headset mic, star tiara
      return `
        <!-- Pink Twintails Back -->
        <path d="M ${cx - 26} ${cy - 14} Q ${cx - 44} ${cy + 10} ${cx - 34} ${cy + 34} Q ${cx - 24} ${cy + 18} ${cx - 20} ${cy - 4} Z" fill="#ec4899" />
        <path d="M ${cx + 26} ${cy - 14} Q ${cx + 44} ${cy + 10} ${cx + 34} ${cy + 34} Q ${cx + 24} ${cy + 18} ${cx + 20} ${cy - 4} Z" fill="#ec4899" />
        <!-- Face -->
        <ellipse cx="${cx}" cy="${cy}" rx="29" ry="28" fill="#fff5eb" />
        <!-- Star Tiara -->
        <polygon points="${cx - 10},${cy - 24} ${cx},${cy - 34} ${cx + 10},${cy - 24} ${cx + 4},${cy - 20} ${cx - 4},${cy - 20}" fill="#fbbf24" />
        <circle cx="${cx}" cy="${cy - 28}" r="2" fill="#ec4899" />
        <!-- Stage Collar -->
        <polygon points="${cx - 20},${cy + 22} ${cx + 20},${cy + 22} ${cx},${cy + 38}" fill="#ec4899" />
        <!-- Pink Bangs -->
        <path d="M ${cx - 28} ${cy - 6} Q ${cx - 18} ${cy - 28} ${cx} ${cy - 28} Q ${cx + 18} ${cy - 28} ${cx + 28} ${cy - 6} L ${cx + 14} ${cy - 10} L ${cx} ${cy - 14} L ${cx - 14} ${cy - 10} Z" fill="#f472b6" />
        <!-- Headset Mic -->
        <path d="M ${cx + 26} ${cy - 4} Q ${cx + 28} ${cy + 14} ${cx + 14} ${cy + 16}" stroke="#0f172a" stroke-width="2" fill="none" stroke-linecap="round" />
        <circle cx="${cx + 12}" cy="${cy + 16}" r="3" fill="#ec4899" />
        <!-- Blushes & Wink ready -->
        <ellipse cx="${cx - 18}" cy="${cy + 8}" rx="5" ry="3" fill="#fb7185" opacity="0.6" />
        <ellipse cx="${cx + 18}" cy="${cy + 8}" rx="5" ry="3" fill="#fb7185" opacity="0.6" />
      `;

    case 'maid':
      // Anime Maid: White lace frilly headdress, dark hair, maid bow
      return `
        <!-- White Frilly Lace Headdress -->
        <path d="M ${cx - 28} ${cy - 10} Q ${cx - 30} ${cy - 34} ${cx} ${cy - 36} Q ${cx + 30} ${cy - 34} ${cx + 28} ${cy - 10} L ${cx + 24} ${cy - 14} Q ${cx} ${cy - 30} ${cx - 24} ${cy - 14} Z" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5" />
        <circle cx="${cx - 26}" cy="${cy - 10}" r="3" fill="#0f172a" />
        <circle cx="${cx + 26}" cy="${cy - 10}" r="3" fill="#0f172a" />
        <!-- Face -->
        <ellipse cx="${cx}" cy="${cy}" rx="29" ry="28" fill="#fff5eb" />
        <!-- Black Maid Collar with White Frill & Blue Bow -->
        <polygon points="${cx - 22},${cy + 22} ${cx + 22},${cy + 22} ${cx},${cy + 38}" fill="#0f172a" />
        <polygon points="${cx - 6},${cy + 24} ${cx + 6},${cy + 24} ${cx},${cy + 34}" fill="#3b82f6" />
        <!-- Neat Dark Bangs -->
        <path d="M ${cx - 28} ${cy - 6} Q ${cx - 18} ${cy - 26} ${cx} ${cy - 26} Q ${cx + 18} ${cy - 26} ${cx + 28} ${cy - 6} L ${cx + 16} ${cy - 8} L ${cx + 4} ${cy - 12} L ${cx - 8} ${cy - 12} L ${cx - 20} ${cy - 8} Z" fill="#1e293b" />
        <!-- Rosy Blushes & Polite Smile -->
        <ellipse cx="${cx - 18}" cy="${cy + 8}" rx="5" ry="3" fill="#fb7185" opacity="0.5" />
        <ellipse cx="${cx + 18}" cy="${cy + 8}" rx="5" ry="3" fill="#fb7185" opacity="0.5" />
        <path d="M ${cx - 3} ${cy + 13} Q ${cx} ${cy + 15} ${cx + 3} ${cy + 13}" stroke="#334155" stroke-width="1.5" stroke-linecap="round" fill="none" />
      `;

    case 'detective':
      // Detective: Sherlock Fedora hat & Houndstooth trench collar
      return `
        <!-- Face -->
        <ellipse cx="${cx}" cy="${cy}" rx="29" ry="28" fill="#fff5eb" />
        <!-- Trench Coat Collar -->
        <polygon points="${cx - 22},${cy + 22} ${cx + 22},${cy + 22} ${cx},${cy + 40}" fill="#78350f" />
        <polygon points="${cx - 4},${cy + 24} ${cx + 4},${cy + 24} ${cx},${cy + 36}" fill="#92400e" />
        <!-- Fedora Hat -->
        <path d="M ${cx - 36} ${cy - 16} Q ${cx} ${cy - 12} ${cx + 36} ${cy - 16} L ${cx + 28} ${cy - 22} Q ${cx} ${cy - 18} ${cx - 28} ${cy - 22} Z" fill="#92400e" />
        <path d="M ${cx - 24} ${cy - 20} Q ${cx - 22} ${cy - 44} ${cx} ${cy - 42} Q ${cx + 22} ${cy - 44} ${cx + 24} ${cy - 20} Z" fill="#78350f" />
        <rect x="${cx - 24}" y="${cy - 24}" width="48" height="5" fill="#f59e0b" />
        <!-- Bangs -->
        <path d="M ${cx - 24} ${cy - 12} L ${cx - 14} ${cy - 4} L ${cx - 6} ${cy - 8} L ${cx + 8} ${cy - 6} L ${cx + 20} ${cy - 12} Z" fill="#451a03" />
        <!-- Smile -->
        <path d="M ${cx - 3} ${cy + 13} Q ${cx} ${cy + 16} ${cx + 3} ${cy + 13}" stroke="#451a03" stroke-width="1.8" stroke-linecap="round" fill="none" />
      `;

    case 'dj_girl':
      // Cyberpunk DJ Girl: Glowing neon green/cyan headphones, neon hair
      return `
        <!-- Glowing Cyan Headphones Arch -->
        <path d="M ${cx - 28} ${cy - 2} Q ${cx} ${cy - 38} ${cx + 28} ${cy - 2}" stroke="#06b6d4" stroke-width="4" fill="none" stroke-linecap="round" />
        <rect x="${cx - 38}" y="${cy - 8}" width="10" height="20" rx="4" fill="#0f172a" stroke="#06b6d4" stroke-width="2" />
        <rect x="${cx + 28}" y="${cy - 8}" width="10" height="20" rx="4" fill="#0f172a" stroke="#06b6d4" stroke-width="2" />
        <circle cx="${cx - 33}" cy="${cy + 2}" r="2" fill="#22d3ee" />
        <circle cx="${cx + 33}" cy="${cy + 2}" r="2" fill="#22d3ee" />
        <!-- Face -->
        <ellipse cx="${cx}" cy="${cy}" rx="28" ry="27" fill="#fff5eb" />
        <!-- Neon Hoodie -->
        <polygon points="${cx - 20},${cy + 20} ${cx + 20},${cy + 20} ${cx},${cy + 36}" fill="#0f172a" />
        <line x1="${cx - 6}" y1="${cy + 24}" x2="${cx + 6}" y2="${cy + 24}" stroke="#06b6d4" stroke-width="2" />
        <!-- Neon Cyan/Purple Bangs -->
        <path d="M ${cx - 26} ${cy - 6} Q ${cx - 16} ${cy - 26} ${cx} ${cy - 26} Q ${cx + 16} ${cy - 26} ${cx + 26} ${cy - 6} L ${cx + 12} ${cy - 8} L ${cx} ${cy - 12} L ${cx - 12} ${cy - 8} Z" fill="#0891b2" />
      `;

    case 'streamer':
      // VTuber Streamer: Lilac hair, glowing cat-ear headset
      return `
        <!-- Cat Ear Headset -->
        <path d="M ${cx - 28} ${cy - 2} Q ${cx} ${cy - 38} ${cx + 28} ${cy - 2}" stroke="#a855f7" stroke-width="4" fill="none" />
        <polygon points="${cx - 22},${cy - 26} ${cx - 28},${cy - 44} ${cx - 10},${cy - 32}" fill="#c084fc" />
        <polygon points="${cx + 22},${cy - 26} ${cx + 28},${cy - 44} ${cx + 10},${cy - 32}" fill="#c084fc" />
        <rect x="${cx - 36}" y="${cy - 8}" width="8" height="18" rx="4" fill="#6b21a8" />
        <rect x="${cx + 28}" y="${cy - 8}" width="8" height="18" rx="4" fill="#6b21a8" />
        <!-- Face -->
        <ellipse cx="${cx}" cy="${cy}" rx="28" ry="27" fill="#fff5eb" />
        <!-- Lilac Bangs -->
        <path d="M ${cx - 26} ${cy - 6} Q ${cx - 16} ${cy - 26} ${cx} ${cy - 26} Q ${cx + 16} ${cy - 26} ${cx + 26} ${cy - 6} L ${cx + 14} ${cy - 8} L ${cx} ${cy - 12} L ${cx - 14} ${cy - 8} Z" fill="#c084fc" />
        <!-- Blushes -->
        <ellipse cx="${cx - 18}" cy="${cy + 8}" rx="5" ry="3" fill="#f472b6" opacity="0.6" />
        <ellipse cx="${cx + 18}" cy="${cy + 8}" rx="5" ry="3" fill="#f472b6" opacity="0.6" />
      `;

    case 'yandere':
      // Yandere Girl: Dark purple hair, red hairpins, ma mị
      return `
        <!-- Dark Violet Hair Back -->
        <ellipse cx="${cx - 24}" cy="${cy + 8}" rx="8" ry="16" fill="#4c0519" />
        <ellipse cx="${cx + 24}" cy="${cy + 8}" rx="8" ry="16" fill="#4c0519" />
        <!-- Face -->
        <ellipse cx="${cx}" cy="${cy}" rx="29" ry="28" fill="#fff1f2" />
        <!-- Dark Uniform & Crimson Ribbon -->
        <polygon points="${cx - 20},${cy + 22} ${cx + 20},${cy + 22} ${cx},${cy + 38}" fill="#1e1b4b" />
        <polygon points="${cx - 6},${cy + 24} ${cx + 6},${cy + 24} ${cx},${cy + 34}" fill="#e11d48" />
        <!-- Dark Violet Bangs -->
        <path d="M ${cx - 28} ${cy - 6} Q ${cx - 18} ${cy - 28} ${cx} ${cy - 28} Q ${cx + 18} ${cy - 28} ${cx + 28} ${cy - 6} L ${cx + 12} ${cy - 8} L ${cx + 2} ${cy - 14} L ${cx - 8} ${cy - 8} Z" fill="#581c87" />
        <!-- Cross Red Hairclips -->
        <line x1="${cx - 24}" y1="${cy - 18}" x2="${cx - 16}" y2="${cy - 10}" stroke="#e11d48" stroke-width="2.5" />
        <line x1="${cx - 16}" y1="${cy - 18}" x2="${cx - 24}" y2="${cy - 10}" stroke="#e11d48" stroke-width="2.5" />
        <!-- Yandere Blushes -->
        <ellipse cx="${cx - 18}" cy="${cy + 8}" rx="6" ry="3.5" fill="#f43f5e" opacity="0.75" />
        <ellipse cx="${cx + 18}" cy="${cy + 8}" rx="6" ry="3.5" fill="#f43f5e" opacity="0.75" />
      `;

    case 'gamer':
      // Cyber Gamer: Gaming Headset with RGB mic, neon bangs
      return `
        <!-- Headset -->
        <path d="M ${cx - 28} ${cy - 2} Q ${cx} ${cy - 38} ${cx + 28} ${cy - 2}" stroke="#8b5cf6" stroke-width="4" fill="none" />
        <rect x="${cx - 36}" y="${cy - 8}" width="8" height="18" rx="4" fill="#3b82f6" />
        <rect x="${cx + 28}" y="${cy - 8}" width="8" height="18" rx="4" fill="#3b82f6" />
        <!-- Face -->
        <ellipse cx="${cx}" cy="${cy}" rx="28" ry="27" fill="#fff5eb" />
        <!-- Dark Gaming T-shirt -->
        <polygon points="${cx - 20},${cy + 20} ${cx + 20},${cy + 20} ${cx},${cy + 36}" fill="#1e1b4b" />
        <polygon points="${cx - 4},${cy + 24} ${cx + 4},${cy + 24} ${cx},${cy + 32}" fill="#8b5cf6" />
        <!-- Blue Spiky Bangs -->
        <path d="M ${cx - 26} ${cy - 6} L ${cx - 18} ${cy - 24} L ${cx} ${cy - 28} L ${cx + 18} ${cy - 24} L ${cx + 26} ${cy - 6} L ${cx + 12} ${cy - 8} L ${cx} ${cy - 14} L ${cx - 12} ${cy - 8} Z" fill="#2563eb" />
      `;

    case 'ninja':
      // Shadow Ninja: Ninja Cowl, Face Mask, Silver Forehead Protector
      return `
        <!-- Ninja Hood -->
        <ellipse cx="${cx}" cy="${cy}" rx="34" ry="33" fill="#1e293b" />
        <!-- Face Opening -->
        <ellipse cx="${cx}" cy="${cy}" rx="26" ry="24" fill="#fff5eb" />
        <!-- Ninja Face Mask Covering Mouth & Nose -->
        <path d="M ${cx - 26} ${cy + 4} Q ${cx} ${cy + 16} ${cx + 26} ${cy + 4} L ${cx + 24} ${cy + 32} Q ${cx} ${cy + 40} ${cx - 24} ${cy + 32} Z" fill="#0f172a" />
        <!-- Forehead Band & Silver Leaf Plate -->
        <rect x="${cx - 24}" y="${cy - 24}" width="48" height="8" rx="2" fill="#0f172a" />
        <rect x="${cx - 12}" y="${cy - 24}" width="24" height="7" rx="2" fill="#94a3b8" />
        <circle cx="${cx}" cy="${cy - 20}" r="1.5" fill="#0f172a" />
      `;

    case 'mage':
      // Grand Wizard / Witch: Pointed Purple Star Wizard Hat
      return `
        <!-- Wizard Pointed Hat -->
        <path d="M ${cx - 36} ${cy - 14} Q ${cx} ${cy - 10} ${cx + 36} ${cy - 14} L ${cx + 24} ${cy - 20} Q ${cx} ${cy - 16} ${cx - 24} ${cy - 20} Z" fill="#4338ca" />
        <polygon points="${cx - 22},${cy - 18} ${cx + 20},${cy - 38} ${cx + 2},${cy - 48} ${cx + 22},${cy - 18}" fill="#4f46e5" />
        <polygon points="${cx - 4},${cy - 22} ${cx + 4},${cy - 22} ${cx},${cy - 28}" fill="#fbbf24" />
        <circle cx="${cx + 2}" cy="${cy - 48}" r="3" fill="#fbbf24" />
        <!-- Face -->
        <ellipse cx="${cx}" cy="${cy + 2}" rx="28" ry="27" fill="#fff5eb" />
        <!-- Magic Robe Collar -->
        <polygon points="${cx - 20},${cy + 22} ${cx + 20},${cy + 22} ${cx},${cy + 38}" fill="#312e81" />
        <circle cx="${cx}" cy="${cy + 30}" r="3" fill="#818cf8" />
        <!-- Mystic Bangs -->
        <path d="M ${cx - 26} ${cy - 8} L ${cx - 16} ${cy - 2} L ${cx} ${cy - 8} L ${cx + 16} ${cy - 2} L ${cx + 26} ${cy - 8} Z" fill="#6366f1" />
      `;

    case 'princess':
      // Royal Princess: Sparkling Golden Crown & Blonde Curls
      return `
        <!-- Blonde Curls Back -->
        <ellipse cx="${cx - 26}" cy="${cy + 6}" rx="10" ry="18" fill="#fde047" />
        <ellipse cx="${cx + 26}" cy="${cy + 6}" rx="10" ry="18" fill="#fde047" />
        <!-- Golden Crown -->
        <polygon points="${cx - 18},${cy - 22} ${cx - 22},${cy - 40} ${cx - 8},${cy - 30} ${cx},${cy - 44} ${cx + 8},${cy - 30} ${cx + 22},${cy - 40} ${cx + 18},${cy - 22}" fill="#fbbf24" stroke="#d97706" stroke-width="1.5" />
        <circle cx="${cx}" cy="${cy - 34}" r="3" fill="#ec4899" />
        <circle cx="${cx - 14}" cy="${cy - 30}" r="2" fill="#10b981" />
        <circle cx="${cx + 14}" cy="${cy - 30}" r="2" fill="#10b981" />
        <!-- Face -->
        <ellipse cx="${cx}" cy="${cy}" rx="29" ry="28" fill="#fff5eb" />
        <!-- Princess Gown & Pearl Necklace -->
        <polygon points="${cx - 20},${cy + 22} ${cx + 20},${cy + 22} ${cx},${cy + 38}" fill="#f472b6" />
        <circle cx="${cx - 6}" cy="${cy + 26}" r="2" fill="#ffffff" />
        <circle cx="${cx}" cy="${cy + 27}" r="2.5" fill="#ffffff" />
        <circle cx="${cx + 6}" cy="${cy + 26}" r="2" fill="#ffffff" />
        <!-- Blonde Bangs -->
        <path d="M ${cx - 28} ${cy - 6} Q ${cx - 18} ${cy - 26} ${cx} ${cy - 26} Q ${cx + 18} ${cy - 26} ${cx + 28} ${cy - 6} L ${cx + 14} ${cy - 8} L ${cx} ${cy - 14} L ${cx - 14} ${cy - 8} Z" fill="#facc15" />
      `;

    case 'knight':
      // Holy Knight: Silver Helmet Visor & Blue Crest Feather
      return `
        <!-- Crest Plume -->
        <path d="M ${cx} ${cy - 34} Q ${cx - 6} ${cy - 48} ${cx - 14} ${cy - 46} Q ${cx - 8} ${cy - 38} ${cx} ${cy - 34}" fill="#0284c7" />
        <!-- Knight Silver Helmet -->
        <ellipse cx="${cx}" cy="${cy}" rx="33" ry="32" fill="#94a3b8" stroke="#64748b" stroke-width="2" />
        <!-- Face opening -->
        <ellipse cx="${cx}" cy="${cy}" rx="26" ry="24" fill="#fff5eb" />
        <!-- Helmet Forehead Plate -->
        <polygon points="${cx - 26},${cy - 12} ${cx},${cy - 28} ${cx + 26},${cy - 12} ${cx},${cy - 18}" fill="#64748b" />
        <!-- Steel Gorget Collar -->
        <polygon points="${cx - 20},${cy + 20} ${cx + 20},${cy + 20} ${cx},${cy + 38}" fill="#475569" />
        <circle cx="${cx}" cy="${cy + 28}" r="2.5" fill="#38bdf8" />
      `;

    case 'vampire':
      // Vampire Count: Pale skin, high-collared red Dracula cape, pointed ears, fangs
      return `
        <!-- High Dracula Cape Collar -->
        <path d="M ${cx - 34} ${cy - 10} L ${cx - 22} ${cy + 28} L ${cx - 16} ${cy + 38} L ${cx + 16} ${cy + 38} L ${cx + 22} ${cy + 28} L ${cx + 34} ${cy - 10} L ${cx + 20} ${cy + 22} L ${cx - 20} ${cy + 22} Z" fill="#881337" stroke="#4c0519" stroke-width="1.5" />
        <!-- Pointed Vampire Ears -->
        <polygon points="${cx - 26},${cy - 6} ${cx - 36},${cy - 14} ${cx - 26},${cy + 4}" fill="#f8fafc" />
        <polygon points="${cx + 26},${cy - 6} ${cx + 36},${cy - 14} ${cx + 26},${cy + 4}" fill="#f8fafc" />
        <!-- Face -->
        <ellipse cx="${cx}" cy="${cy}" rx="28" ry="27" fill="#f8fafc" />
        <!-- Dark Vampire Velvet Vest & Ruby -->
        <polygon points="${cx - 18},${cy + 20} ${cx + 18},${cy + 20} ${cx},${cy + 38}" fill="#0f172a" />
        <circle cx="${cx}" cy="${cy + 28}" r="3" fill="#e11d48" />
        <!-- Slick Black Hair with Widows Peak -->
        <path d="M ${cx - 26} ${cy - 4} Q ${cx - 20} ${cy - 30} ${cx} ${cy - 30} Q ${cx + 20} ${cy - 30} ${cx + 26} ${cy - 4} L ${cx + 12} ${cy - 12} L ${cx} ${cy - 8} L ${cx - 12} ${cy - 12} Z" fill="#0f172a" />
        <!-- Vampire Smile with Tiny Fangs -->
        <path d="M ${cx - 4} ${cy + 13} Q ${cx} ${cy + 16} ${cx + 4} ${cy + 13}" stroke="#4c0519" stroke-width="1.5" stroke-linecap="round" fill="none" />
        <polygon points="${cx - 3},${cy + 14} ${cx - 2},${cy + 18} ${cx - 1},${cy + 14}" fill="#ffffff" />
        <polygon points="${cx + 1},${cy + 14} ${cx + 2},${cy + 18} ${cx + 3},${cy + 14}" fill="#ffffff" />
      `;

    case 'demon_lord':
      // Demon Lord: Curved Obsidian Horns & Dark Flame Aura
      return `
        <!-- Obsidian Curved Horns -->
        <path d="M ${cx - 16} ${cy - 16} Q ${cx - 38} ${cy - 42} ${cx - 26} ${cy - 48} Q ${cx - 20} ${cy - 34} ${cx - 8} ${cy - 24} Z" fill="#1e1b4b" stroke="#be123c" stroke-width="1.5" />
        <path d="M ${cx + 16} ${cy - 16} Q ${cx + 38} ${cy - 42} ${cx + 26} ${cy - 48} Q ${cx + 20} ${cy - 34} ${cx + 8} ${cy - 24} Z" fill="#1e1b4b" stroke="#be123c" stroke-width="1.5" />
        <!-- Face -->
        <ellipse cx="${cx}" cy="${cy}" rx="28" ry="27" fill="#fff1f2" />
        <!-- Demonic Armor Collar -->
        <polygon points="${cx - 20},${cy + 20} ${cx + 20},${cy + 20} ${cx},${cy + 38}" fill="#0f172a" />
        <polygon points="${cx - 5},${cy + 24} ${cx + 5},${cy + 24} ${cx},${cy + 34}" fill="#be123c" />
        <!-- Crimson Mark on Forehead -->
        <polygon points="${cx},${cy - 16} ${cx + 3},${cy - 10} ${cx},${cy - 4} ${cx - 3},${cy - 10}" fill="#e11d48" />
      `;

    case 'chuuni':
      // Chuunibyou: Eyepatch on left eye & dark flaming bangs
      return `
        <!-- Face -->
        <ellipse cx="${cx}" cy="${cy}" rx="29" ry="28" fill="#fff5eb" />
        <!-- High Collar Uniform -->
        <polygon points="${cx - 20},${cy + 22} ${cx + 20},${cy + 22} ${cx},${cy + 38}" fill="#1e1b4b" />
        <circle cx="${cx}" cy="${cy + 28}" r="2.5" fill="#e11d48" />
        <!-- Eyepatch on Left Eye -->
        <line x1="${cx - 30}" y1="${cy - 10}" x2="${cx + 10}" y2="${cy + 16}" stroke="#0f172a" stroke-width="2" />
        <rect x="${cx - 18}" y="${cy - 4}" width="12" height="12" rx="2" fill="#0f172a" />
        <circle cx="${cx - 12}" cy="${cy + 2}" r="2" fill="#e11d48" />
        <!-- Spiky Dark Crimson Bangs -->
        <path d="M ${cx - 28} ${cy - 6} L ${cx - 18} ${cy - 26} L ${cx} ${cy - 30} L ${cx + 18} ${cy - 26} L ${cx + 28} ${cy - 6} L ${cx + 12} ${cy - 8} L ${cx} ${cy - 14} L ${cx - 12} ${cy - 8} Z" fill="#881337" />
      `;

    // ================= THẦN THOẠI & HUYỀN ẢO =================
    case 'slime':
      // Bouncy crystal slime with mini crown
      return `
        <!-- Slime Body -->
        <path d="M ${cx - 32} ${cy + 14} Q ${cx - 36} ${cy - 14} ${cx - 12} ${cy - 26} Q ${cx} ${cy - 36} ${cx + 12} ${cy - 26} Q ${cx + 36} ${cy - 14} ${cx + 32} ${cy + 14} Q ${cx + 24} ${cy + 30} ${cx} ${cy + 28} Q ${cx - 24} ${cy + 30} ${cx - 32} ${cy + 14} Z" fill="#06b6d4" />
        <path d="M ${cx - 26} ${cy + 10} Q ${cx - 28} ${cy - 10} ${cx} ${cy - 20} Q ${cx + 28} ${cy - 10} ${cx + 26} ${cy + 10} Q ${cx + 18} ${cy + 24} ${cx} ${cy + 22} Q ${cx - 18} ${cy + 24} ${cx - 26} ${cy + 10} Z" fill="#22d3ee" opacity="0.6" />
        <!-- Mini Crown -->
        <polygon points="${cx - 8},${cy - 26} ${cx - 10},${cy - 36} ${cx - 4},${cy - 30} ${cx},${cy - 38} ${cx + 4},${cy - 30} ${cx + 10},${cy - 36} ${cx + 8},${cy - 26}" fill="#fbbf24" />
        <!-- Glistening Shine -->
        <polygon points="${cx - 20},${cy - 12} ${cx - 15},${cy - 18} ${cx - 11},${cy - 15} ${cx - 16},${cy - 9}" fill="#ffffff" opacity="0.8" />
        <circle cx="${cx - 8}" cy="${cy - 20}" r="2.5" fill="#ffffff" opacity="0.8" />
        <!-- Cute Blushes & Smile -->
        <ellipse cx="${cx - 18}" cy="${cy + 10}" rx="5" ry="3" fill="#f43f5e" opacity="0.5" />
        <ellipse cx="${cx + 18}" cy="${cy + 10}" rx="5" ry="3" fill="#f43f5e" opacity="0.5" />
        <path d="M ${cx - 3} ${cy + 12} Q ${cx} ${cy + 15} ${cx + 3} ${cy + 12}" stroke="#0e7490" stroke-width="2" stroke-linecap="round" fill="none" />
      `;

    case 'ghost':
      // Friendly cute ghost with mini witch hat
      return `
        <!-- Floating Ghost Body -->
        <path d="M ${cx - 30} ${cy + 8} Q ${cx - 30} ${cy - 26} ${cx} ${cy - 28} Q ${cx + 30} ${cy - 26} ${cx + 30} ${cy + 8} Q ${cx + 24} ${cy + 30} ${cx + 16} ${cy + 24} Q ${cx + 8} ${cy + 32} ${cx} ${cy + 24} Q ${cx - 8} ${cy + 32} ${cx - 16} ${cy + 24} Q ${cx - 24} ${cy + 30} ${cx - 30} ${cy + 8} Z" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5" />
        <!-- Mini Purple Witch Hat -->
        <polygon points="${cx - 16},${cy - 22} ${cx + 16},${cy - 22} ${cx + 6},${cy - 44} ${cx - 2},${cy - 22}" fill="#7c3aed" />
        <rect x="${cx - 16}" y="${cy - 24}" width="32" height="4" rx="2" fill="#a855f7" />
        <!-- Cute Blushes -->
        <ellipse cx="${cx - 18}" cy="${cy + 8}" rx="5" ry="3" fill="#f472b6" opacity="0.55" />
        <ellipse cx="${cx + 18}" cy="${cy + 8}" rx="5" ry="3" fill="#f472b6" opacity="0.55" />
        <path d="M ${cx - 3} ${cy + 12} Q ${cx} ${cy + 16} ${cx + 3} ${cy + 12}" stroke="#64748b" stroke-width="1.8" stroke-linecap="round" fill="none" />
      `;

    case 'dragon':
      // Imperial Dragon with Golden Horns & Crown
      return `
        <!-- Dragon Golden Horns -->
        <polygon points="${cx - 20},${cy - 20} ${cx - 38},${cy - 48} ${cx - 10},${cy - 30}" fill="#f59e0b" />
        <polygon points="${cx + 20},${cy - 20} ${cx + 38},${cy - 48} ${cx + 10},${cy - 30}" fill="#f59e0b" />
        <!-- Dragon Crown -->
        <polygon points="${cx - 16},${cy - 26} ${cx - 22},${cy - 42} ${cx - 8},${cy - 32} ${cx},${cy - 46} ${cx + 8},${cy - 32} ${cx + 22},${cy - 42} ${cx + 16},${cy - 26}" fill="#fbbf24" stroke="#d97706" stroke-width="1.5" />
        <circle cx="${cx}" cy="${cy - 34}" r="3" fill="#dc2626" />
        <!-- Head -->
        <ellipse cx="${cx}" cy="${cy}" rx="36" ry="33" fill="#dc2626" />
        <ellipse cx="${cx}" cy="${cy + 8}" rx="26" ry="20" fill="#fef2f2" />
        <!-- Royal Collar & Ruby -->
        <path d="M ${cx - 20} ${cy + 28} Q ${cx} ${cy + 36} ${cx + 20} ${cy + 28}" stroke="#f59e0b" stroke-width="4" stroke-linecap="round" fill="none" />
        <circle cx="${cx}" cy="${cy + 34}" r="4.5" fill="#dc2626" stroke="#fbbf24" stroke-width="1.5" />
        <!-- Snout -->
        <ellipse cx="${cx}" cy="${cy + 12}" rx="12" ry="7" fill="#991b1b" />
        <circle cx="${cx - 3.5}" cy="${cy + 12}" r="1.5" fill="#fbbf24" />
        <circle cx="${cx + 3.5}" cy="${cy + 12}" r="1.5" fill="#fbbf24" />
      `;

    case 'robot':
      // Cyber AI Mecha with digital LED eyes
      return `
        <!-- Robot Antenna -->
        <line x1="${cx}" y1="${cy - 30}" x2="${cx}" y2="${cy - 44}" stroke="#0284c7" stroke-width="3" stroke-linecap="round" />
        <circle cx="${cx}" cy="${cy - 44}" r="5" fill="#38bdf8" />
        <circle cx="${cx}" cy="${cy - 44}" r="2" fill="#ffffff" />
        <!-- Robot Head Frame -->
        <rect x="${cx - 34}" y="${cy - 30}" width="68" height="60" rx="14" fill="#0f172a" stroke="#0284c7" stroke-width="2.5" />
        <rect x="${cx - 40}" y="${cy - 8}" width="6" height="16" rx="2" fill="#38bdf8" />
        <rect x="${cx + 34}" y="${cy - 8}" width="6" height="16" rx="2" fill="#38bdf8" />
        <!-- Inner Digital Visor Screen -->
        <rect x="${cx - 28}" y="${cy - 18}" width="56" height="38" rx="8" fill="#0369a1" opacity="0.3" />
        <!-- Speaker mouth -->
        <rect x="${cx - 12}" y="${cy + 14}" width="24" height="4" rx="2" fill="#38bdf8" />
      `;

    // ================= LINH VẬT ĐỘNG VẬT ĐỘC BẢN =================
    case 'owl':
      // Cú duy nhất: Scholar Owl
      return `
        <path d="M ${cx - 24} ${cy - 22} L ${cx - 34} ${cy - 38} L ${cx - 14} ${cy - 28} Z" fill="#047857" />
        <path d="M ${cx + 24} ${cy - 22} L ${cx + 34} ${cy - 38} L ${cx + 14} ${cy - 28} Z" fill="#047857" />
        <ellipse cx="${cx}" cy="${cy}" rx="36" ry="34" fill="#10b981" />
        <ellipse cx="${cx}" cy="${cy + 6}" rx="28" ry="24" fill="#ecfdf5" />
        <!-- Mortarboard Hat -->
        <polygon points="${cx},${cy - 38} ${cx + 24},${cy - 30} ${cx},${cy - 22} ${cx - 24},${cy - 30}" fill="#0f172a" />
        <rect x="${cx - 8}" y="${cy - 25}" width="16" height="6" rx="2" fill="#1e293b" />
        <circle cx="${cx}" cy="${cy - 30}" r="2.5" fill="#f59e0b" />
        <path d="M ${cx} ${cy - 30} Q ${cx + 18} ${cy - 28} ${cx + 20} ${cy - 16}" stroke="#f59e0b" stroke-width="2" fill="none" />
        <circle cx="${cx + 20}" cy="${cy - 16}" r="2" fill="#f59e0b" />
        <ellipse cx="${cx - 20}" cy="${cy + 12}" rx="5" ry="3" fill="#f43f5e" opacity="0.35" />
        <ellipse cx="${cx + 20}" cy="${cy + 12}" rx="5" ry="3" fill="#f43f5e" opacity="0.35" />
        <polygon points="${cx},${cy + 14} ${cx - 5},${cy + 7} ${cx + 5},${cy + 7}" fill="#f59e0b" />
      `;

    case 'cat':
      // Mèo duy nhất: Orange Tabby Cat
      return `
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
        <!-- Nose -->
        <polygon points="${cx},${cy + 10} ${cx - 3},${cy + 7} ${cx + 3},${cy + 7}" fill="#f43f5e" />
        <path d="M ${cx - 5} ${cy + 14} Q ${cx - 2.5} ${cy + 12} ${cx} ${cy + 10} Q ${cx + 2.5} ${cy + 12} ${cx + 5} ${cy + 14}" stroke="#c2410c" stroke-width="1.5" fill="none" stroke-linecap="round" />
        <ellipse cx="${cx - 20}" cy="${cy + 10}" rx="5" ry="3" fill="#fda4af" opacity="0.5" />
        <ellipse cx="${cx + 20}" cy="${cy + 10}" rx="5" ry="3" fill="#fda4af" opacity="0.5" />
      `;

    case 'fox':
      // Cáo duy nhất: Clever Orange Fox with glasses
      return `
        <!-- Fox Ears -->
        <polygon points="${cx - 28},${cy - 16} ${cx - 38},${cy - 44} ${cx - 10},${cy - 28}" fill="#c2410c" />
        <polygon points="${cx - 32},${cy - 36} ${cx - 38},${cy - 44} ${cx - 24},${cy - 32}" fill="#0f172a" />
        <polygon points="${cx - 24},${cy - 18} ${cx - 30},${cy - 34} ${cx - 14},${cy - 26}" fill="#ffedd5" />
        <polygon points="${cx + 28},${cy - 16} ${cx + 38},${cy - 44} ${cx + 10},${cy - 28}" fill="#c2410c" />
        <polygon points="${cx + 32},${cy - 36} ${cx + 38},${cy - 44} ${cx + 24},${cy - 32}" fill="#0f172a" />
        <polygon points="${cx + 24},${cy - 18} ${cx + 30},${cy - 34} ${cx + 14},${cy - 26}" fill="#ffedd5" />
        <!-- Head -->
        <ellipse cx="${cx}" cy="${cy}" rx="36" ry="32" fill="#ea580c" />
        <path d="M ${cx - 36} ${cy + 2} Q ${cx - 15} ${cy + 20} ${cx} ${cy + 15} Q ${cx + 15} ${cy + 20} ${cx + 36} ${cy + 2} Q ${cx + 15} ${cy + 34} ${cx} ${cy + 34} Q ${cx - 15} ${cy + 34} ${cx - 36} ${cy + 2} Z" fill="#ffffff" />
        <!-- Round Glasses -->
        <circle cx="${cx - 12}" cy="${cy + 2}" r="12" fill="none" stroke="#f59e0b" stroke-width="2" />
        <circle cx="${cx + 12}" cy="${cy + 2}" r="12" fill="none" stroke="#f59e0b" stroke-width="2" />
        <line x1="${cx - 2}" y1="${cy + 2}" x2="${cx + 2}" y2="${cy + 2}" stroke="#f59e0b" stroke-width="2" />
        <polygon points="${cx},${cy + 16} ${cx - 4},${cy + 11} ${cx + 4},${cy + 11}" fill="#0f172a" />
      `;

    case 'bear':
      // Gấu duy nhất: Brown Bear with Blue Beret
      return `
        <!-- Bear Ears -->
        <circle cx="${cx - 28}" cy="${cy - 24}" r="12" fill="#78350f" />
        <circle cx="${cx - 28}" cy="${cy - 24}" r="7" fill="#fed7aa" />
        <circle cx="${cx + 28}" cy="${cy - 24}" r="12" fill="#78350f" />
        <circle cx="${cx + 28}" cy="${cy - 24}" r="7" fill="#fed7aa" />
        <!-- Head -->
        <ellipse cx="${cx}" cy="${cy}" rx="36" ry="34" fill="#92400e" />
        <ellipse cx="${cx}" cy="${cy + 12}" rx="18" ry="14" fill="#fed7aa" />
        <ellipse cx="${cx}" cy="${cy + 7}" rx="6" ry="4" fill="#1e1b4b" />
        <path d="M ${cx - 4} ${cy + 15} Q ${cx} ${cy + 18} ${cx + 4} ${cy + 15}" stroke="#78350f" stroke-width="2" fill="none" stroke-linecap="round" />
        <!-- Blue Beret Hat -->
        <ellipse cx="${cx - 8}" cy="${cy - 28}" rx="22" ry="10" fill="#2563eb" />
        <circle cx="${cx - 8}" cy="${cy - 34}" r="3" fill="#f59e0b" />
        <ellipse cx="${cx - 22}" cy="${cy + 12}" rx="5" ry="3" fill="#f43f5e" opacity="0.3" />
        <ellipse cx="${cx + 22}" cy="${cy + 12}" rx="5" ry="3" fill="#f43f5e" opacity="0.3" />
      `;

    case 'bunny':
      // Thỏ duy nhất: White Bunny with Carrot Pin
      return `
        <!-- Bunny Tall Ears -->
        <ellipse cx="${cx - 16}" cy="${cy - 34}" rx="10" ry="24" fill="#ffffff" stroke="#fbcfe8" stroke-width="1.5" />
        <ellipse cx="${cx - 16}" cy="${cy - 34}" rx="6" ry="18" fill="#f472b6" opacity="0.6" />
        <ellipse cx="${cx + 16}" cy="${cy - 34}" rx="10" ry="24" fill="#ffffff" stroke="#fbcfe8" stroke-width="1.5" />
        <ellipse cx="${cx + 16}" cy="${cy - 34}" rx="6" ry="18" fill="#f472b6" opacity="0.6" />
        <!-- Head -->
        <ellipse cx="${cx}" cy="${cy}" rx="35" ry="32" fill="#ffffff" stroke="#fbcfe8" stroke-width="1" />
        <ellipse cx="${cx - 20}" cy="${cy + 8}" rx="6" ry="4" fill="#fb7185" opacity="0.45" />
        <ellipse cx="${cx + 20}" cy="${cy + 8}" rx="6" ry="4" fill="#fb7185" opacity="0.45" />
        <polygon points="${cx},${cy + 9} ${cx - 3.5},${cy + 5} ${cx + 3.5},${cy + 5}" fill="#f43f5e" />
        <circle cx="${cx + 22}" cy="${cy - 18}" r="5" fill="#fbbf24" />
        <circle cx="${cx + 22}" cy="${cy - 18}" r="2" fill="#f97316" />
      `;

    case 'shiba':
      // Chó duy nhất: Golden Shiba with Red Bandana
      return `
        <!-- Shiba Ears -->
        <polygon points="${cx - 28},${cy - 16} ${cx - 36},${cy - 42} ${cx - 10},${cy - 26}" fill="#d97706" />
        <polygon points="${cx - 25},${cy - 18} ${cx - 31},${cy - 37} ${cx - 13},${cy - 25}" fill="#fef3c7" />
        <polygon points="${cx + 28},${cy - 16} ${cx + 36},${cy - 42} ${cx + 10},${cy - 26}" fill="#d97706" />
        <polygon points="${cx + 25},${cy - 18} ${cx + 31},${cy - 37} ${cx + 13},${cy - 25}" fill="#fef3c7" />
        <!-- Head -->
        <ellipse cx="${cx}" cy="${cy}" rx="36" ry="33" fill="#f59e0b" />
        <path d="M ${cx - 36} ${cy + 6} Q ${cx - 16} ${cy + 18} ${cx} ${cy + 10} Q ${cx + 16} ${cy + 18} ${cx + 36} ${cy + 6} Q ${cx + 20} ${cy + 34} ${cx} ${cy + 34} Q ${cx - 20} ${cy + 34} ${cx - 36} ${cy + 6} Z" fill="#ffffff" />
        <ellipse cx="${cx - 14}" cy="${cy - 14}" rx="4" ry="3" fill="#ffffff" />
        <ellipse cx="${cx + 14}" cy="${cy - 14}" rx="4" ry="3" fill="#ffffff" />
        <polygon points="${cx - 22},${cy + 28} ${cx + 22},${cy + 28} ${cx},${cy + 40}" fill="#ef4444" />
        <circle cx="${cx}" cy="${cy + 30}" r="2" fill="#ffffff" />
        <polygon points="${cx},${cy + 12} ${cx - 4},${cy + 8} ${cx + 4},${cy + 8}" fill="#1e1b4b" />
      `;

    case 'penguin':
      // Cánh cụt duy nhất: Penguin with Winter Beanie
      return `
        <ellipse cx="${cx}" cy="${cy}" rx="36" ry="36" fill="#0f172a" />
        <ellipse cx="${cx}" cy="${cy + 6}" rx="26" ry="24" fill="#f8fafc" />
        <path d="M ${cx - 30} ${cy - 18} Q ${cx} ${cy - 44} ${cx + 30} ${cy - 18} Z" fill="#e11d48" />
        <rect x="${cx - 32}" y="${cy - 20}" width="64" height="8" rx="4" fill="#fbbf24" />
        <circle cx="${cx}" cy="${cy - 38}" r="5" fill="#fbbf24" />
        <polygon points="${cx},${cy + 14} ${cx - 7},${cy + 6} ${cx + 7},${cy + 6}" fill="#f97316" />
        <polygon points="${cx - 10},${cy + 28} ${cx + 10},${cy + 28} ${cx},${cy + 33}" fill="#f59e0b" />
        <polygon points="${cx - 10},${cy + 38} ${cx + 10},${cy + 38} ${cx},${cy + 33}" fill="#f59e0b" />
      `;

    case 'wolf':
    case 'president':
      // Sói duy nhất: Silver Wolf with Cyan Tie
      return `
        <!-- Wolf Ears -->
        <polygon points="${cx - 26},${cy - 16} ${cx - 36},${cy - 46} ${cx - 10},${cy - 28}" fill="#334155" />
        <polygon points="${cx - 23},${cy - 18} ${cx - 32},${cy - 40} ${cx - 13},${cy - 26}" fill="#bae6fd" />
        <polygon points="${cx + 28},${cy - 16} ${cx + 38},${cy - 46} ${cx + 12},${cy - 28}" fill="#334155" />
        <polygon points="${cx + 25},${cy - 18} ${cx + 34},${cy - 40} ${cx + 15},${cy - 26}" fill="#bae6fd" />
        <ellipse cx="${cx}" cy="${cy}" rx="36" ry="33" fill="#475569" />
        <path d="M ${cx - 36} ${cy + 4} Q ${cx - 15} ${cy + 18} ${cx} ${cy + 12} Q ${cx + 15} ${cy + 18} ${cx + 36} ${cy + 4} Q ${cx + 15} ${cy + 34} ${cx} ${cy + 34} Q ${cx - 15} ${cy + 34} ${cx - 36} ${cy + 4} Z" fill="#f8fafc" />
        <polygon points="${cx - 18},${cy + 26} ${cx + 18},${cy + 26} ${cx},${cy + 42}" fill="#0f172a" />
        <polygon points="${cx - 4},${cy + 28} ${cx + 4},${cy + 28} ${cx},${cy + 44}" fill="#0284c7" />
        <polygon points="${cx},${cy + 14} ${cx - 4},${cy + 9} ${cx + 4},${cy + 9}" fill="#0f172a" />
      `;

    case 'swan':
    case 'queen':
      // Thiên nga duy nhất: Royal Swan with Amethyst Tiara
      return `
        <polygon points="${cx - 16},${cy - 22} ${cx - 20},${cy - 38} ${cx - 8},${cy - 30} ${cx},${cy - 42} ${cx + 8},${cy - 30} ${cx + 20},${cy - 38} ${cx + 16},${cy - 22}" fill="#a855f7" stroke="#7e22ce" stroke-width="1.5" />
        <circle cx="${cx}" cy="${cy - 32}" r="3" fill="#fdf4ff" />
        <ellipse cx="${cx}" cy="${cy}" rx="35" ry="34" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5" />
        <polygon points="${cx - 16},${cy + 4} ${cx},${cy + 14} ${cx + 16},${cy + 4}" fill="#0f172a" />
        <polygon points="${cx - 7},${cy + 9} ${cx},${cy + 18} ${cx + 7},${cy + 9}" fill="#f97316" />
        <polygon points="${cx - 14},${cy + 28} ${cx + 14},${cy + 28} ${cx},${cy + 36}" fill="#9333ea" />
        <circle cx="${cx}" cy="${cy + 36}" r="3.5" fill="#38bdf8" />
      `;

    case 'lion':
    case 'leader':
      // Sư tử duy nhất: Golden Lion with Mane & Monocle
      return `
        <path d="M ${cx - 28} ${cy - 28} L ${cx - 44} ${cy - 36} L ${cx - 36} ${cy - 18} L ${cx - 48} ${cy} L ${cx - 36} ${cy + 18} L ${cx - 44} ${cy + 36} L ${cx - 24} ${cy + 34} L ${cx} ${cy + 46} L ${cx + 24} ${cy + 34} L ${cx + 44} ${cy + 36} L ${cx + 36} ${cy + 18} L ${cx + 48} ${cy} L ${cx + 36} ${cy - 18} L ${cx + 44} ${cy - 36} L ${cx + 28} ${cy - 28} L ${cx} ${cy - 46} Z" fill="#b45309" />
        <ellipse cx="${cx}" cy="${cy}" rx="33" ry="31" fill="#f59e0b" />
        <ellipse cx="${cx}" cy="${cy + 8}" rx="24" ry="18" fill="#fef3c7" />
        <circle cx="${cx + 12}" cy="${cy + 2}" r="12" fill="none" stroke="#f59e0b" stroke-width="2" />
        <polygon points="${cx - 18},${cy + 26} ${cx + 18},${cy + 26} ${cx},${cy + 42}" fill="#1e1b4b" />
        <circle cx="${cx}" cy="${cy + 34}" r="3" fill="#fbbf24" />
        <polygon points="${cx},${cy + 12} ${cx - 4},${cy + 8} ${cx + 4},${cy + 8}" fill="#78350f" />
      `;

    case 'deer':
    case 'noble':
      // Hươu duy nhất: Crystal Antler Deer
      return `
        <path d="M ${cx - 14} ${cy - 18} Q ${cx - 28} ${cy - 36} ${cx - 22} ${cy - 48} M ${cx - 20} ${cy - 32} Q ${cx - 36} ${cy - 36} ${cx - 34} ${cy - 46} M ${cx + 14} ${cy - 18} Q ${cx + 28} ${cy - 36} ${cx + 22} ${cy - 48} M ${cx + 20} ${cy - 32} Q ${cx + 36} ${cy - 36} ${cx + 34} ${cy - 46}" stroke="#0d9488" stroke-width="3" stroke-linecap="round" fill="none" />
        <circle cx="${cx - 22}" cy="${cy - 48}" r="2.5" fill="#2dd4bf" />
        <circle cx="${cx + 22}" cy="${cy - 48}" r="2.5" fill="#2dd4bf" />
        <ellipse cx="${cx}" cy="${cy}" rx="34" ry="32" fill="#0f766e" />
        <ellipse cx="${cx}" cy="${cy + 10}" rx="20" ry="16" fill="#ccfbf1" />
        <polygon points="${cx},${cy - 16} ${cx + 3.5},${cy - 9} ${cx},${cy - 2} ${cx - 3.5},${cy - 9}" fill="#5eead4" />
        <polygon points="${cx},${cy + 11} ${cx - 3},${cy + 7} ${cx + 3},${cy + 7}" fill="#134e4a" />
      `;

    case 'panther':
      // Báo đen duy nhất: Black Panther
      return `
        <polygon points="${cx - 26},${cy - 16} ${cx - 36},${cy - 42} ${cx - 10},${cy - 26}" fill="#0f172a" />
        <polygon points="${cx + 26},${cy - 16} ${cx + 36},${cy - 42} ${cx + 10},${cy - 26}" fill="#0f172a" />
        <ellipse cx="${cx}" cy="${cy}" rx="36" ry="33" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
        <ellipse cx="${cx}" cy="${cy + 8}" rx="24" ry="18" fill="#0f172a" />
        <path d="M ${cx - 24} ${cy + 16} Q ${cx} ${cy + 26} ${cx + 24} ${cy + 16} L ${cx + 18} ${cy + 36} L ${cx - 18} ${cy + 36} Z" fill="#2563eb" />
        <polygon points="${cx},${cy + 10} ${cx - 3.5},${cy + 6} ${cx + 3.5},${cy + 6}" fill="#475569" />
      `;

    case 'villain':
      // Quạ đen duy nhất: Dark Raven
      return `
        <!-- Raven Feathers -->
        <polygon points="${cx - 26},${cy - 18} ${cx - 38},${cy - 38} ${cx - 14},${cy - 26}" fill="#3b0764" />
        <polygon points="${cx + 26},${cy - 18} ${cx + 38},${cy - 38} ${cx + 14},${cy - 26}" fill="#3b0764" />
        <ellipse cx="${cx}" cy="${cy}" rx="35" ry="34" fill="#1e1b4b" stroke="#4c1d95" stroke-width="1.5" />
        <polygon points="${cx - 8},${cy + 6} ${cx},${cy + 18} ${cx + 8},${cy + 6}" fill="#f59e0b" />
        <polygon points="${cx - 16},${cy + 26} ${cx + 16},${cy + 26} ${cx},${cy + 38}" fill="#7c3aed" />
      `;

    case 'memegirl':
      // Ếch xanh duy nhất: Pepe Frog
      return `
        <!-- Frog Eyes Top Bumps -->
        <circle cx="${cx - 16}" cy="${cy - 22}" r="14" fill="#22c55e" stroke="#15803d" stroke-width="1.5" />
        <circle cx="${cx + 16}" cy="${cy - 22}" r="14" fill="#22c55e" stroke="#15803d" stroke-width="1.5" />
        <!-- Head -->
        <ellipse cx="${cx}" cy="${cy}" rx="36" ry="30" fill="#22c55e" stroke="#15803d" stroke-width="1.5" />
        <ellipse cx="${cx}" cy="${cy + 8}" rx="28" ry="18" fill="#86efac" />
        <!-- Meme Cap -->
        <path d="M ${cx - 26} ${cy - 24} Q ${cx} ${cy - 40} ${cx + 26} ${cy - 24} L ${cx + 36} ${cy - 20} L ${cx - 20} ${cy - 20} Z" fill="#0284c7" />
        <!-- Wide Frog Mouth -->
        <path d="M ${cx - 22} ${cy + 12} Q ${cx} ${cy + 20} ${cx + 22} ${cy + 12}" stroke="#14532d" stroke-width="2.5" stroke-linecap="round" fill="none" />
      `;

    case 'chaotic':
      // Khỉ duy nhất: Playful Monkey
      return `
        <!-- Monkey Big Ears -->
        <circle cx="${cx - 32}" cy="${cy}" r="14" fill="#b45309" />
        <circle cx="${cx - 32}" cy="${cy}" r="8" fill="#fde68a" />
        <circle cx="${cx + 32}" cy="${cy}" r="14" fill="#b45309" />
        <circle cx="${cx + 32}" cy="${cy}" r="8" fill="#fde68a" />
        <!-- Head -->
        <ellipse cx="${cx}" cy="${cy}" rx="32" ry="30" fill="#92400e" />
        <ellipse cx="${cx}" cy="${cy + 8}" rx="22" ry="16" fill="#fde68a" />
        <!-- Orange Bandana -->
        <rect x="${cx - 26}" y="${cy - 22}" width="52" height="7" rx="3" fill="#ea580c" />
        <!-- Smile -->
        <path d="M ${cx - 8} ${cy + 12} Q ${cx} ${cy + 18} ${cx + 8} ${cy + 12}" stroke="#78350f" stroke-width="2" stroke-linecap="round" fill="none" />
      `;

    case 'classmate':
      // Hamster duy nhất: Shy Hamster with Clover Pin
      return `
        <!-- Hamster Ears -->
        <circle cx="${cx - 26}" cy="${cy - 20}" r="11" fill="#f59e0b" />
        <circle cx="${cx - 26}" cy="${cy - 20}" r="6" fill="#fecdd3" />
        <circle cx="${cx + 26}" cy="${cy - 20}" r="11" fill="#f59e0b" />
        <circle cx="${cx + 26}" cy="${cy - 20}" r="6" fill="#fecdd3" />
        <!-- Head -->
        <ellipse cx="${cx}" cy="${cy}" rx="35" ry="32" fill="#fbbf24" />
        <ellipse cx="${cx}" cy="${cy + 8}" rx="24" ry="18" fill="#fffbeb" />
        <!-- Clover Pin -->
        <circle cx="${cx - 20}" cy="${cy - 16}" r="3" fill="#10b981" />
        <circle cx="${cx - 16}" cy="${cy - 20}" r="3" fill="#10b981" />
        <!-- Rosy Cheeks & Tiny Nose -->
        <ellipse cx="${cx - 18}" cy="${cy + 10}" rx="6" ry="4" fill="#fb7185" opacity="0.6" />
        <ellipse cx="${cx + 18}" cy="${cy + 10}" rx="6" ry="4" fill="#fb7185" opacity="0.6" />
        <polygon points="${cx},${cy + 9} ${cx - 3},${cy + 6} ${cx + 3},${cy + 6}" fill="#f43f5e" />
      `;

    default:
      return getMascotBaseSvg('osananajimi', cx, cy);
  }
}
