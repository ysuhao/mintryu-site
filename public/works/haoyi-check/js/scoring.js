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
    const normalized = (indices) => {
      const score = indices.reduce((sum, idx) => sum + scoreAt(idx), 0);
      const maximum = indices.reduce((sum, idx) =>
        sum + Math.max(...Data.QUESTIONS[idx].options.map(option => option.score)), 0);
      return maximum > 0 ? score / maximum : 0;
    };

    // 从每个题目的选项计算满分，题库调整时仍保持各类型可比较。
    const buckets = [
      { id: 'vibe', name: '氛围型', n: normalized([0, 1, 2, 7, 11]) },
      { id: 'pose', name: '死装型', n: normalized([3, 5, 6]) },
      { id: 'niche', name: '小众型', n: normalized([8, 9, 10]) },
      { id: 'gaze', name: '凝视型', n: (scoreAt(12) + (answers[14] === 'A' ? 4 : 0)) /
        (Math.max(...Data.QUESTIONS[12].options.map(option => option.score)) + 4) },
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

  function shareUrl(result) {
    const base = typeof location !== 'undefined'
      ? `${location.origin}${location.pathname}${location.hash || ''}`
      : 'https://mintryu.com/works/haoyi-check/';
    const url = new URL(base);
    url.searchParams.set('r', result.bits);
    return url.href;
  }

  function shareText(result) {
    return `我的豪意值 ${result.haoyi}，${result.tier.name}。来测测你几分 👉 ${shareUrl(result)}`;
  }

  return {
    encode,
    decode,
    isValidBits,
    compute,
    shareText,
    shareUrl,
    pickTier,
    KEYS,
  };
});
