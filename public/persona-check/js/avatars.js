/* ===== 人格验牌 · C1-C9 像素风人物立绘 =====
 * 风格参考：弹丸论破像素小人 / 捏咔 Q 版捏人 —— 二头身、粗描边、三阶明暗、大眼高光。
 * 实现：ASCII 像素图 → SVG rect，24×26 网格，后期可整体替换为手绘/AI 生图。
 */

(function (root) {
  // 固定色
  const K = '#2b2430'; // 描边
  const S = '#ffd9b3'; // 皮肤
  const s = '#edbd90'; // 皮肤阴影
  const E = '#2b2430'; // 眼睛
  const W = '#ffffff';
  const M = '#c2695c'; // 嘴
  const B = '#ff9e9e'; // 腮红

  const GRID_W = 24, GRID_H = 26, PX = 8;

  /* ---------- 共享身体（头/躯干/四肢） ---------- */
  // O=衣服主色 o=衣服阴影 L=裤子 F=鞋
  const BODY = [
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '....KSSSSSSSSSSSSSSK....',
    '....KSSSSSSSSSSSSSSK....',
    '....KSSSSSSSSSSSSSSK....',
    '....KSSSSSSSSSSSSSSK....',
    '....KSSSSSSSSSSSSSSK....',
    '....KSSSSSSSSSSSSSSK....',
    '....KSSSSSSSSSSSSSSK....',
    '....KSSSSSSSSSSSSSSK....',
    '....KSSSSSSSSSSSSSSK....',
    '.....KKKKKKKKKKKKKK.....',
    '......KOOOSSSOOOOK......',
    '....KOKOOOOOOOOOOKOK....',
    '....KOKOOOOOOOOOoKOK....',
    '....KSKOOOOOOOOOoKSK....',
    '....KSKOOOOOOOOOoKSK....',
    '......KKKKKKKKKKKK......',
    '.......KLLK..KLLK.......',
    '.......KLLK..KLLK.......',
    '......KFFFK..KFFFK......',
    '......KKKKK..KKKKK......',
    '........................',
  ];

  /* ---------- 发型（覆盖 rows 1-7） ---------- */
  // 每个角色一段 24 列的像素行，空缺行自动补 '.'
  const HAIR = {
    // C1 户晨风粉丝：整齐黑发侧分
    neat: [
      '........................',
      '........KKKKKKKK........',
      '......KKHHHHHHHHKK......',
      '.....KHHHHHHHHHHHHK.....',
      '....KHHHhHHHHHHhHHHK....',
      '....KHHhHHHHHHHHhHHK....',
      '....KHHSSSSSSSSSSHHK....',
      '....KHSSSSSSSSSSSSHK....',
    ],
    // C2 安卓嘉豪：刺猬头 + 绿色呆毛
    spiky: [
      '.........KAAK...........',
      '.........KAAK...........',
      '.....KH.KH.KH.KH.K......',
      '....KHHHHHHHHHHHHK......',
      '....KHHhHHHHHHhHHK......',
      '....KHHHHHHHHHHHHK......',
      '....KHHSSSSSSSSSSHK.....',
      '....KHSSSSSSSSSSSSK.....',
    ],
    // C3 原批：金色波波头 + 两侧长鬓角
    bob: [
      '........................',
      '.......KKKKKKKKKK.......',
      '.....KKHHHHHHHHHHKK.....',
      '....KHHHHHHHHHHHHHHK....',
      '...KHHHHHHHHHHHHHHHHK...',
      '...KHHHHHHHHHHHHHHHHK...',
      '...KHHHSSSSSSSSSSHHHK...',
      '..KKHHSSSSSSSSSSSSHHKK..',
      '..KHH..............HHK..',
      '..KHH..............HHK..',
      '..KHK..............KHK..',
      '...K................K...',
    ],
    // C4 瓦学弟：红色棒球帽（替代头发）
    cap: [
      '........................',
      '......KKKKKKKKKKK.......',
      '....KKCCCCCCCCCCCKK.....',
      '...KCCCCCCCCCCCCCCCK....',
      '...KCCCCCCCCCCCCCCCKCCK.',
      '....KHHSSSSSSSSSSHHK....',
      '....KHSSSSSSSSSSSSHK....',
    ],
    // C5 抖音预设人：凌乱塌发
    messy: [
      '........................',
      '.....KK..KKKK..KK.......',
      '....KHHKKHHHHKKHHK......',
      '...KHHHHHHHHHHHHHHHK....',
      '...KHHhHHHHHHHHHHhHK....',
      '...KHHSKSSSSSSKSSHHK....',
      '...KHHSSSSSSSSSSSSHK....',
    ],
    // C6 美股嘉豪：棕色背头
    slick: [
      '........................',
      '.......KKKKKKKKK........',
      '.....KKHHHHHHHHHKK......',
      '....KHHHHHHHHHHHHHK.....',
      '....KHhHHHHHHHHHhHK.....',
      '....KHSSSSSSSSSSSSHK....',
      '....KHSSSSSSSSSSSSHK....',
      '....K.SSSSSSSSSSSS.K....',
    ],
    // C7 A股韭菜：深绿短发（韭菜苗另加）
    short: [
      '........................',
      '........................',
      '.....KKKKKKKKKKKK.......',
      '....KHHHHHHHHHHHHHK.....',
      '....KHHHHHHHHHHHHHK.....',
      '....KHHSSSSSSSSSSHK.....',
      '....KHSSSSSSSSSSSSK.....',
      '....K.SSSSSSSSSSSS.K....',
    ],
    // C8 笔电男大：棕色卷发
    curly: [
      '........................',
      '......KK.KK.KK.KK.K.....',
      '....KKHKKHKKHKKHKK......',
      '...KHHHHHHHHHHHHHHHK....',
      '...KHHhHHHHHHHHHHhHK....',
      '...KHHHHHHHHHHHHHHHK....',
      '...KHHSSSSSSSSSSSSHHK...',
      '...KHSSSSSSSSSSSSSSHK...',
    ],
    // C9 赛博仓鼠：浅棕短发 + 仓鼠耳朵
    hamster: [
      '..KKK..........KKK.....',
      '.KHEHK........KHEHK....',
      '.KHHHK.KKKKKK.KHHHK....',
      '..KKKKHHHHHHHHKKKK.....',
      '....KHHHHHHHHHHK.......',
      '....KHHHHHHHHHHHHK......',
      '....KHHSSSSSSSSHHK......',
      '....KHSSSSSSSSSSHK......',
    ],
  };

  /* ---------- 小贴片工具 ---------- */
  // 相对坐标像素图 → 绝对坐标
  function offsetMap(rows, dx, dy) {
    return rows.map(r => '.'.repeat(dx) + r).map((r, i) => ({ y: dy + i, row: r }));
  }

  /* ---------- 眼睛（rows 8-10，左眼 cols 7-8，右眼 cols 15-16） ---------- */
  const EYES = {
    normal: [
      [W, E], [E, E], [E, E], // 单眼 2×3，含高光
    ],
    sparkle: [
      [W, E], [E, W], [E, E],
    ],
    hollow: [ // 无高光空洞眼
      ['#8a8fa3', '#8a8fa3'], ['#8a8fa3', '#8a8fa3'], ['#555a6e', '#555a6e'],
    ],
    tired: [ // 半闭眼
      [s, s], [E, E], [E, E],
    ],
  };
  function eyesRects(style) {
    const eye = EYES[style] || EYES.normal;
    const out = [];
    for (const ex of [7, 15]) {
      eye.forEach((line, dy) => {
        line.forEach((c, dx) => out.push({ x: ex + dx, y: 8 + dy, c }));
      });
    }
    return out;
  }

  /* ---------- 嘴（rows 12-13） ---------- */
  const MOUTHS = {
    smile: [[10, 12, M], [11, 12, M], [12, 12, M], [13, 12, M]],
    cat: [[10, 12, M], [11, 13, M], [12, 13, M], [13, 12, M]],
    shy: [[11, 12, M], [12, 12, M]],
    flat: [[10, 12, '#8a8fa3'], [11, 12, '#8a8fa3'], [12, 12, '#8a8fa3'], [13, 12, '#8a8fa3']],
    smirk: [[10, 12, M], [11, 12, M], [12, 12, M], [13, 11, M]],
    buckteeth: [ // 仓鼠大门牙
      [10, 12, M], [11, 12, W], [12, 12, W], [13, 12, M],
      [11, 13, W], [12, 13, W],
    ],
    weak: [[11, 12, M], [12, 12, M], [13, 12, M]],
  };

  /* ---------- 通用贴片（腮红/眼镜/墨镜/汗滴等） ---------- */
  function blush(big) {
    const p = [[6, 11, B], [17, 11, B]];
    if (big) p.push([6, 10, B], [17, 10, B], [5, 11, B], [18, 11, B]);
    return p.map(([x, y, c]) => ({ x, y, c }));
  }
  const GLASSES = [ // 方框眼镜
    ...frame(6, 7), ...frame(13, 7),
    { x: 11, y: 8, c: K }, { x: 12, y: 8, c: K },
  ];
  function frame(fx, fy) {
    const p = [];
    for (let i = 0; i < 5; i++) { p.push({ x: fx + i, y: fy, c: K }, { x: fx + i, y: fy + 4, c: K }); }
    for (let j = 1; j < 4; j++) { p.push({ x: fx, y: fy + j, c: K }, { x: fx + 4, y: fy + j, c: K }); }
    return p;
  }
  const SUNGLASSES = (() => {
    const p = [];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
      p.push({ x: 6 + i, y: 8 + j, c: '#14121c' }, { x: 14 + i, y: 8 + j, c: '#14121c' });
    }
    p.push({ x: 7, y: 8, c: '#5b5b70' }, { x: 15, y: 8, c: '#5b5b70' }); // 反光
    for (let i = 10; i < 14; i++) p.push({ x: i, y: 8, c: '#14121c' }); // 鼻梁
    return p;
  })();

  /* ---------- 手持/漂浮道具（独立小像素图） ---------- */
  // P=屏幕/亮色 G=荧光 Y=黄 R=红 D=深灰 V=银
  const PROPS = {
    iphone: { dx: 18, dy: 13, rows: [
      'KKKK',
      'KPPK',
      'KPPK',
      'KPPK',
      'KPPK',
      'KPPK',
      'KKKK',
    ], pal: { P: '#93c5fd' } },
    androidPhone: { dx: 18, dy: 13, rows: [
      'KKKK',
      'KGGK',
      'KWKK',
      'KGGK',
      'KGGK',
      'KGGK',
      'KKKK',
    ], pal: { G: '#3ddc84' } },
    primogem: { dx: 0, dy: 9, rows: [
      '..K..',
      '.KPK.',
      'KPPPK',
      '.KPK.',
      '..K..',
    ], pal: { P: '#9be7ff' } },
    glowPhone: { dx: 1, dy: 13, rows: [
      'KKKK',
      'KGGK',
      'KGGK',
      'KGGK',
      'KGGK',
      'KGGK',
      'KKKK',
    ], pal: { G: '#67e8f9' } },
    chart: { dx: 16, dy: 2, rows: [
      '......G',
      '....G.G',
      '....G.G',
      '..G.G.G',
      '..G.G.G',
      'G.G.G.G',
    ], pal: { G: '#4ade80' } },
    leek: { dx: 9, dy: 0, rows: [
      '.K...K.',
      'KLK.KLK',
      '.LKKKL.',
      '..KGK..',
      '..KGK..',
    ], pal: { L: '#4ade80', G: '#16a34a' } },
    macbook: { dx: 6, dy: 16, rows: [
      'KKKKKKKKKKKK',
      'KDDDDDDDDDDK',
      'KDDDDWWDDDDK',
      'KDDDDDDDDDDK',
      'KKKKKKKKKKKK',
      '.KVVVVVVVVK.',
      '..KKKKKKKK..',
    ], pal: { D: '#60a5fa', V: '#cbd5e1' } },
    coffee: { dx: 19, dy: 15, rows: [
      '.KKK.',
      'KNNNK',
      'KWWWK',
      'KWWWK',
      '.KKK.',
    ], pal: { N: '#b45309' } },
    folder: { dx: 17, dy: 16, rows: [
      'KKKK..',
      'KYYYYK',
      'KYYYYK',
      'KYYYYK',
      'KKKKKK',
    ], pal: { Y: '#fde047' } },
    airpods: [ // 直接以坐标贴片画
      { x: 3, y: 9, c: W }, { x: 3, y: 10, c: '#d4d4d8' },
      { x: 20, y: 9, c: W }, { x: 20, y: 10, c: '#d4d4d8' },
    ],
    sweat: [{ x: 19, y: 7, c: '#7dd3fc' }, { x: 19, y: 8, c: '#7dd3fc' }, { x: 19, y: 9, c: '#bae6fd' }],
    faceglow: [{ x: 5, y: 8, c: '#a5f3fc' }, { x: 5, y: 9, c: '#a5f3fc' }, { x: 5, y: 10, c: '#67e8f9' }],
    starpin: [{ x: 16, y: 3, c: '#ffd54a' }, { x: 15, y: 4, c: '#ffd54a' }, { x: 16, y: 4, c: '#fff3b0' }, { x: 17, y: 4, c: '#ffd54a' }, { x: 16, y: 5, c: '#ffd54a' }],
    cheeks: [{ x: 5, y: 10, c: s }, { x: 5, y: 11, c: s }, { x: 18, y: 10, c: s }, { x: 18, y: 11, c: s }],
  };

  /* ---------- 角色配置 ---------- */
  const CHARS = {
    C1: { bg1: '#aab4f8', bg2: '#e4e8ff', hair: 'neat',   pal: { H: '#3a3f52', O: '#eef0f7', o: '#c9ccdd', L: '#3a3f52', F: '#eef0f7' }, eyes: 'normal',  mouth: 'smile',     extra: ['airpods'],           props: ['iphone'] },
    C2: { bg1: '#7fe7b2', bg2: '#ddf9ea', hair: 'spiky',  pal: { H: '#1f2937', A: '#3ddc84', O: '#3ddc84', o: '#28b56b', L: '#1f2937', F: '#111827' }, eyes: 'normal',  mouth: 'smirk',     extra: ['glasses'],           props: ['androidPhone'] },
    C3: { bg1: '#fcd34d', bg2: '#fff3c9', hair: 'bob',    pal: { H: '#f5d76e', O: '#8fb8ff', o: '#6a93e8', L: '#eef0f7', F: '#f5d76e' }, eyes: 'sparkle', mouth: 'smile',     extra: ['blush', 'starpin'],  props: ['primogem'] },
    C4: { bg1: '#fb9aad', bg2: '#ffe3e9', hair: 'cap',    pal: { H: '#334155', C: '#e11d48', O: '#475569', o: '#334155', L: '#1e293b', F: '#e11d48' }, eyes: 'normal',  mouth: 'shy',       extra: ['blushBig'],          props: [] },
    C5: { bg1: '#7fe3f5', bg2: '#dcf7fd', hair: 'messy',  pal: { H: '#404050', O: '#64748b', o: '#475569', L: '#334155', F: '#64748b' }, eyes: 'hollow',  mouth: 'flat',      extra: ['faceglow'],          props: ['glowPhone'] },
    C6: { bg1: '#6fdcb0', bg2: '#dbf7e9', hair: 'slick',  pal: { H: '#6b4226', O: '#0ea371', o: '#0b7f5a', L: '#1f2937', F: '#6b4226' }, eyes: 'none',    mouth: 'smile',     extra: ['sunglasses'],        props: ['chart'] },
    C7: { bg1: '#c4eb6b', bg2: '#f2fbcf', hair: 'short',  pal: { H: '#365314', O: '#f1f5f9', o: '#cbd5e1', L: '#65a30d', F: '#365314' }, eyes: 'tired',   mouth: 'weak',      extra: ['sweat'],             props: ['leek'] },
    C8: { bg1: '#a5acfb', bg2: '#e6e8ff', hair: 'curly',  pal: { H: '#8b5a2b', O: '#6366f1', o: '#4f46e5', L: '#312e81', F: '#8b5a2b' }, eyes: 'normal',  mouth: 'cat',       extra: [],                    props: ['macbook', 'coffee'] },
    C9: { bg1: '#fdba74', bg2: '#ffecd4', hair: 'hamster',pal: { H: '#d9a066', E2: '#f9a8d4', O: '#f59e0b', o: '#d97706', L: '#92400e', F: '#d9a066' }, eyes: 'sparkle', mouth: 'buckteeth', extra: ['cheeks'],           props: ['folder'] },
  };

  /* ---------- 渲染 ---------- */
  function rect(x, y, c) {
    return `<rect x="${x * PX}" y="${y * PX}" width="${PX}" height="${PX}" fill="${c}"/>`;
  }

  function drawMap(rows, pal, out) {
    rows.forEach((rowStr, y) => {
      for (let x = 0; x < rowStr.length && x < GRID_W; x++) {
        const ch = rowStr[x];
        if (ch === '.') continue;
        const c = pal[ch];
        if (c) out.push(rect(x, y, c));
      }
    });
  }

  function drawProp(def, out) {
    const pal = Object.assign({ K, W }, def.pal);
    def.rows.forEach((rowStr, dy) => {
      for (let i = 0; i < rowStr.length; i++) {
        const ch = rowStr[i];
        if (ch === '.') continue;
        const c = pal[ch];
        if (c) out.push(rect(def.dx + i, def.dy + dy, c));
      }
    });
  }

  function avatarSVG(id) {
    const cfg = CHARS[id] || CHARS.C1;
    const bodyPal = { K, S, s, M, O: cfg.pal.O, o: cfg.pal.o, L: cfg.pal.L, F: cfg.pal.F };
    const hairPal = { K, S, H: cfg.pal.H, h: shade(cfg.pal.H), A: cfg.pal.A || '#3ddc84', C: cfg.pal.C || '#e11d48', E: cfg.pal.E2 || '#f9a8d4' };

    const parts = [];
    // 背景
    parts.push(
      `<defs><radialGradient id="g-${id}" cx="50%" cy="30%" r="85%">` +
      `<stop offset="0%" stop-color="${cfg.bg2}"/><stop offset="100%" stop-color="${cfg.bg1}"/>` +
      `</radialGradient></defs>`,
      `<rect width="${GRID_W * PX}" height="${GRID_H * PX}" fill="url(#g-${id})"/>`
    );
    // 背景像素星光
    for (const [sx, sy, sc] of [[3, 3, '#ffffff88'], [20, 6, '#ffffff66'], [2, 16, '#ffffff55'], [21, 19, '#ffffff66'], [12, 1, '#ffffff55']]) {
      parts.push(`<rect x="${sx * PX}" y="${sy * PX}" width="${PX}" height="${PX}" fill="${sc}"/>`);
    }
    // 地面
    parts.push(`<ellipse cx="${12 * PX}" cy="${24.6 * PX}" rx="${8 * PX}" ry="${1.2 * PX}" fill="rgba(34,28,57,.16)"/>`);

    // 身体 → 发型 → 五官 → 贴片 → 道具
    drawMap(BODY, bodyPal, parts);
    drawMap(HAIR[cfg.hair], hairPal, parts);
    if (cfg.eyes !== 'none') eyesRects(cfg.eyes).forEach(p => parts.push(rect(p.x, p.y, p.c)));
    (MOUTHS[cfg.mouth] || MOUTHS.smile).forEach(m => { if (m) parts.push(rect(m[0], m[1], m[2])); });

    for (const ex of cfg.extra) {
      if (ex === 'blush') blush(false).forEach(p => parts.push(rect(p.x, p.y, p.c)));
      else if (ex === 'blushBig') blush(true).forEach(p => parts.push(rect(p.x, p.y, p.c)));
      else if (ex === 'glasses') GLASSES.forEach(p => parts.push(rect(p.x, p.y, p.c)));
      else if (ex === 'sunglasses') SUNGLASSES.forEach(p => parts.push(rect(p.x, p.y, p.c)));
      else if (PROPS[ex] && Array.isArray(PROPS[ex])) PROPS[ex].forEach(p => parts.push(rect(p.x, p.y, p.c)));
    }
    for (const pn of cfg.props) {
      const def = PROPS[pn];
      if (def && def.rows) drawProp(def, parts);
    }

    return `<svg viewBox="0 0 ${GRID_W * PX} ${GRID_H * PX}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" role="img" aria-label="${id}">${parts.join('')}</svg>`;
  }

  function shade(hex) {
    const n = parseInt(hex.slice(1), 16);
    const f = c => Math.max(0, Math.round(c * 0.72));
    return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
  }

  root.Avatars = { avatarSVG };
})(typeof self !== 'undefined' ? self : this);
