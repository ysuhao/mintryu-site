/* ===== 豪意值检测 · 计分与类型派生（纯逻辑，无 DOM） ===== */
(function (root, factory) {
  const api = factory(root.HaoyiData);
  root.HaoyiScoring = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this, function (Data) {
  const KEYS = ['A', 'B', 'C', 'D'];
  const KEY_TO_IDX = { A: 0, B: 1, C: 2, D: 3 };

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  function encode(answers) {
    return answers.map((k) => KEY_TO_IDX[k] ?? 0).join('');
  }

  function decode(bits) {
    if (!isValidBits(bits)) return null;
    return bits.split('').map((ch) => KEYS[Number(ch)] || 'A');
  }

  function isValidBits(value) {
    return typeof value === 'string' && /^[0-3]{15}$/.test(value);
  }

  function getOption(qIndex, key) {
    const q = Data.QUESTIONS[qIndex];
    return q.options.find((o) => o.key === key) || q.options[0];
  }

  function pickTier(haoyi) {
    for (const t of Data.TIERS) {
      if (haoyi >= t.min && haoyi <= t.max) return t;
    }
    return Data.TIERS[Data.TIERS.length - 1];
  }

  /**
   * 从答题模式派生「嘉豪类型」标签
   * 氛围型 / 死装型 / 小众型 / 凝视型 / 自在极意型
   */
  function deriveType(answers, flags) {
    if (flags.forceZizai) return { id: 'zizai', name: '自在极意型' };

    const scoreAt = (idx) => getOption(idx, answers[idx]).score;

    // 氛围：Q1 穿搭、Q2 打碟、Q3 雨中、Q8 耳机、Q12 健身仪式
    const vibe = scoreAt(0) + scoreAt(1) + scoreAt(2) + scoreAt(7) + scoreAt(11);
    // 死装：Q4 中英夹杂、Q6 朋友圈、Q7 金融科技
    const pose = scoreAt(3) + scoreAt(5) + scoreAt(6);
    // 小众：Q9 头像、Q10 口头禅、Q11 音乐
    const niche = scoreAt(8) + scoreAt(9) + scoreAt(10);
    // 凝视：Q13 评论、Q15 凝视他人
    const gaze = scoreAt(12) + (answers[14] === 'A' ? 4 : 0);

    // 归一到可比较量级（各桶满分不同）
    const buckets = [
      { id: 'vibe', name: '氛围型', n: vibe / 40 },
      { id: 'pose', name: '死装型', n: pose / 24 },
      { id: 'niche', name: '小众型', n: niche / 12 },
      { id: 'gaze', name: '凝视型', n: gaze / 8 },
    ];
    buckets.sort((a, b) => b.n - a.n);
    return { id: buckets[0].id, name: buckets[0].name };
  }

  function compute(answers) {
    if (!Array.isArray(answers) || answers.length !== Data.QUESTIONS.length) {
      throw new Error(`Expected ${Data.QUESTIONS.length} answers`);
    }

    let raw = 0;
    const detail = [];
    answers.forEach((key, i) => {
      const opt = getOption(i, key);
      raw += opt.score;
      detail.push({ q: i + 1, key, score: opt.score, text: opt.text });
    });

    const q14 = answers[13];
    const q15 = answers[14];

    // 倒扣不会让显示分变负
    const rawClamped = Math.max(raw, 0);
    let haoyi = Math.round((rawClamped / Data.MAX_RAW) * 100);
    haoyi = clamp(haoyi, 0, 100);

    // 隐藏最高档：Q14 选 D 且 haoyi >= 71 → 强制自在极意·豪
    const forceZizai = q14 === 'D' && haoyi >= 71;
    if (forceZizai) {
      haoyi = Math.max(haoyi, 91);
    }

    const tier = forceZizai
      ? Data.TIERS.find((t) => t.id === 'T5')
      : pickTier(haoyi);

    const flags = {
      forceZizai,
      bGeTip: q14 === 'A', // 有活出局 → B 哥提示
      selfAwareSave: q15 === 'C', // 强烈自觉自救
    };

    const type = deriveType(answers, flags);

    return {
      raw,
      rawClamped,
      haoyi,
      tier,
      type,
      flags,
      detail,
      bits: encode(answers),
    };
  }

  function shareText(result) {
    const base =
      typeof location !== 'undefined'
        ? `${location.origin}${location.pathname}`
        : 'https://mintryu.com/works/haoyi-check/';
    return `我的豪意值 ${result.haoyi}，${result.tier.name}。来测测你几分 👉 ${base}`;
  }

  return {
    encode,
    decode,
    isValidBits,
    compute,
    shareText,
    pickTier,
    KEYS,
  };
});
