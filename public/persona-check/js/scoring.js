/* ===== 人格验牌 · 16 题可解释计分与结果编码（纯逻辑，无 DOM 依赖） ===== */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Scoring = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const C_IDS = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9'];
  const S_IDS = ['S1', 'S2', 'S3', 'S4'];
  const MAX_SCORES = {
    C1: 6, C2: 6, C3: 4, C4: 4, C5: 7, C6: 6, C7: 6, C8: 11, C9: 6,
    S1: 6, S2: 6, S3: 6, S4: 7,
  };
  const SCORE_SD = {
    C1: Math.sqrt(4.5), C2: Math.sqrt(4.5), C3: Math.sqrt(2.5), C4: Math.sqrt(2.5),
    C5: Math.sqrt(4.75), C6: Math.sqrt(4.5), C7: Math.sqrt(4.5), C8: Math.sqrt(6.75), C9: Math.sqrt(4.5),
  };

  // 每个选择都可以同时提供主证据和弱交叉证据，减少单题直接决定结果。
  const WEIGHTS = [
    { A: { C1: 3 }, B: { C2: 3 } },
    { A: { C3: 1, C4: 1 }, B: { C5: 3 } },
    { A: { C3: 3 }, B: { C4: 3 } },
    { A: { C6: 3 }, B: { C7: 3 } },
    { A: { C8: 2 }, B: { S1: 3 } },
    { A: { C5: 1 }, B: { C8: 1 } },
    { A: { S2: 3 }, B: { S3: 3 } },
    { A: { S4: 7 }, B: {} },
    { A: { C1: 3 }, B: { C2: 3 } },
    { A: { C9: 3 }, B: { C8: 3 } },
    { A: { C6: 3 }, B: { C7: 3 } },
    { A: { C8: 3 }, B: { C9: 3 } },
    { A: { C8: 2 }, B: { C5: 3 } },
    { A: {}, B: { S1: 3 } },
    { A: { S2: 3 }, B: {} },
    { A: {}, B: { S3: 3 } },
  ];

  const EVIDENCE = [
    { A: '换手机时直接站进苹果生态', B: '换手机时更看重安卓的折腾自由' },
    { A: '周末更愿意留给游戏和番剧', B: '周末容易在无意识刷手机中消失' },
    { A: '开一把更偏爱原神与星铁', B: '开一把更偏爱瓦的即时竞技' },
    { A: '闲钱更愿意交给纳指与 VOO', B: '闲钱更愿意冲进 A 股搏短线' },
    { A: '把 AI 当作写代码查资料的工具', B: '把 AI 当作聊天更多的电子搭子' },
    { A: '主要使用豆包或 Kimi', B: '主要使用 ChatGPT 或 Claude' },
    { A: '朋友圈是表情包和梗图阵地', B: '朋友圈更像滤镜拉满的精致九宫格' },
    { A: '穿搭偏爱暗黑地雷系', B: '穿搭好看舒服就行' },
    { A: '新设备到手先完成全生态同步', B: '新设备到手先解锁和深度定制' },
    { A: '习惯先收藏“以后有用”的内容', B: '会立刻开电脑并展开十几个页面' },
    { A: '市场下跌时仍保持长期主义', B: '市场一动就会进入高强度信息模式' },
    { A: '电脑常驻多任务生产力现场', B: '把大量知识囤积在收藏夹里' },
    { A: '截止日前会用笔记本和仪式感开工', B: '截止日前仍可能被信息流拖住' },
    { A: 'AI 宕机主要影响效率', B: 'AI 宕机会带来熟人失联般的空落感' },
    { A: '群聊冷场时会用精准梗图救场', B: '群聊冷场时更习惯安静观察' },
    { A: '喜欢的东西更在意立刻拥有', B: '为了精致生活会认真比价和叠优惠' },
  ];

  function encode(answers) {
    return answers.map(answer => (answer === 'B' ? '1' : '0')).join('');
  }

  function decode(bits) {
    return bits.split('').map(bit => (bit === '1' ? 'B' : 'A'));
  }

  function isValidBits(value) {
    return typeof value === 'string' && /^[01]{16}$/.test(value);
  }

  function hash(value) {
    let result = 0;
    for (let i = 0; i < value.length; i++) result = (result * 31 + value.charCodeAt(i)) >>> 0;
    return result;
  }

  function ranked(affinities, ids, seed) {
    return ids.slice().sort((a, b) => affinities[b] - affinities[a] || ((hash(seed + a) % 997) - (hash(seed + b) % 997)));
  }

  function compute(answers) {
    if (!Array.isArray(answers) || answers.length !== WEIGHTS.length) {
      throw new Error(`Expected ${WEIGHTS.length} answers`);
    }

    const scores = {};
    const evidenceById = {};
    for (const id of C_IDS.concat(S_IDS)) {
      scores[id] = 0;
      evidenceById[id] = [];
    }

    answers.forEach((answer, questionIndex) => {
      const choice = answer === 'B' ? 'B' : 'A';
      const weights = WEIGHTS[questionIndex][choice];
      Object.entries(weights).forEach(([id, value]) => {
        scores[id] += value;
        evidenceById[id].push({ value, text: EVIDENCE[questionIndex][choice], questionIndex });
      });
    });

    const seed = encode(answers);
    const affinities = {};
    for (const id of C_IDS) {
      // 不同标签由不同数量的问题支持；用标准化偏离量消除“题少的标签更容易极端”的偏差。
      const standardized = 0.5 + ((scores[id] - MAX_SCORES[id] / 2) / SCORE_SD[id]) * 0.2;
      affinities[id] = Math.max(0, Math.min(1, standardized));
    }
    for (const id of S_IDS) affinities[id] = scores[id] / MAX_SCORES[id];
    const circleRanking = ranked(affinities, C_IDS, seed);
    const spiritRanking = ranked(affinities, S_IDS, seed);
    const circle = circleRanking[0];
    const runnerUp = circleRanking[1];
    const spirit = spiritRanking[0];
    const top = affinities[circle];
    const second = affinities[runnerUp];
    const margin = top + second === 0 ? 0 : (top - second) / (top + second);
    // “浓度”是标签亲和度而非互斥概率，因此主身份与次倾向不要求相加为 100。
    const circlePct = Math.min(95, Math.round(55 + top * 20 + margin * 20));
    const runnerPct = Math.round(25 + second * 15);
    const reasons = evidenceById[circle]
      .sort((a, b) => b.value - a.value || a.questionIndex - b.questionIndex)
      .slice(0, 3)
      .map(item => item.text);

    return {
      circle,
      spirit,
      runnerUp,
      circlePct,
      runnerPct,
      reasons,
      scores,
      affinities,
    };
  }

  return { encode, decode, isValidBits, compute, questionCount: WEIGHTS.length };
});
