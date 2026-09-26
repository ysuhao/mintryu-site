/* ===== 豪意值检测 · 页面流程 ===== */
(function () {
  const Data = window.HaoyiData;
  const Scoring = window.HaoyiScoring;
  const $ = (id) => document.getElementById(id);

  const views = {
    home: $('view-home'),
    quiz: $('view-quiz'),
    computing: $('view-computing'),
    result: $('view-result'),
  };

  let answers = [];
  let lastResult = null;

  function show(name) {
    for (const key of Object.keys(views)) {
      views[key].classList.toggle('hidden', key !== name);
    }
    window.scrollTo(0, 0);
  }

  function toast(msg, ms = 2400) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), ms);
  }

  /* ---------- 首页 ---------- */
  $('btn-start').addEventListener('click', () => startQuiz());

  function startQuiz() {
    answers = [];
    lastResult = null;
    history.replaceState(null, '', location.pathname + location.hash);
    show('quiz');
    renderQuestion(0);
  }

  /* ---------- 答题 ---------- */
  function renderQuestion(i) {
    const q = Data.QUESTIONS[i];
    const inner = $('quiz-inner');
    inner.classList.remove('leaving');
    inner.style.animation = 'none';
    void inner.offsetWidth;
    inner.style.animation = '';

    $('progress-bar').style.width = `${(i / Data.QUESTIONS.length) * 100}%`;
    $('quiz-step').textContent = `第 ${i + 1} 题 / 共 ${Data.QUESTIONS.length} 题`;
    $('quiz-tag').textContent = q.tag;
    $('quiz-title').textContent = q.title;

    const box = $('options');
    box.innerHTML = '';
    q.options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option';
      btn.innerHTML = `<span class="opt-key">${opt.key}</span><span class="opt-text">${escapeHtml(opt.text)}</span>`;
      btn.addEventListener('click', () => pick(i, opt.key));
      box.appendChild(btn);
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function pick(i, key) {
    answers[i] = key;
    if (i + 1 < Data.QUESTIONS.length) {
      $('quiz-inner').classList.add('leaving');
      setTimeout(() => renderQuestion(i + 1), 180);
    } else {
      $('progress-bar').style.width = '100%';
      showComputing();
    }
  }

  /* ---------- 计算中 ---------- */
  let dotsTimer = null;
  function showComputing() {
    show('computing');
    let n = 0;
    $('dots').textContent = '';
    clearInterval(dotsTimer);
    dotsTimer = setInterval(() => {
      n = (n + 1) % 4;
      $('dots').textContent = '...'.slice(0, n);
    }, 300);
    setTimeout(() => {
      clearInterval(dotsTimer);
      showResult(answers);
    }, 1400);
  }

  /* ---------- 结果 ---------- */
  function showResult(ans) {
    const result = Scoring.compute(ans);
    lastResult = result;

    history.replaceState(null, '', `${location.pathname}?r=${result.bits}${location.hash}`);

    const hero = $('result-hero');
    hero.className = `result-hero accent-${result.tier.accent || 'pink'}`;

    $('score-num').textContent = String(result.haoyi);
    $('tier-name').textContent = result.tier.name;
    $('quote').textContent = result.tier.quote;
    $('comment').textContent = result.tier.comment;
    $('tag-type').textContent = result.type.name;
    $('tag-tier').textContent = result.tier.name.split('·')[0];

    // tips（互不覆盖：自在极意彩蛋优先于 B 哥提示）
    const tipB = $('tip-bge');
    const tipSave = $('tip-save');
    tipB.classList.add('hidden');
    tipSave.classList.add('hidden');
    tipB.classList.add('warn');

    if (result.flags.forceZizai) {
      tipB.classList.remove('hidden');
      tipB.classList.remove('warn');
      tipB.textContent = '隐藏触发：浑然不觉 · 自在极意豪彩蛋已解锁。';
    } else if (result.flags.bGeTip) {
      tipB.classList.remove('hidden');
      tipB.textContent =
        "检测到「有活」信号——你可能不是嘉豪，是 B 哥。有本事的人装，那叫底气。";
    }
    if (result.flags.selfAwareSave) {
      tipSave.classList.remove('hidden');
      tipSave.textContent = '你靠自觉自救了，这很不嘉豪，可喜可贺。';
    }

    $('disclaimer').textContent = Data.DISCLAIMER;

    // meter animate
    const fill = $('meter-fill');
    fill.style.width = '0%';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        fill.style.width = `${result.haoyi}%`;
      });
    });
    $('meter-value').textContent = `${result.haoyi} / 100`;

    show('result');
  }

  /* ---------- 操作按钮 ---------- */
  $('btn-retry').addEventListener('click', () => startQuiz());

  $('btn-share').addEventListener('click', async () => {
    if (!lastResult) return;
    const text = Scoring.shareText(lastResult);
    try {
      if (navigator.share) {
        await navigator.share({
          title: '豪意值检测',
          text,
          url: location.href.split('?')[0],
        });
        return;
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast('分享文案已复制');
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      toast('分享文案已复制');
    }
  });

  $('btn-copy-link').addEventListener('click', async () => {
    const url = location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast('结果链接已复制');
    } catch {
      toast('请手动复制地址栏链接');
    }
  });

  /* 豪到你了？ */
  $('btn-haodao').addEventListener('click', () => {
    const lines = Data.HAODAO_LINES;
    const line = lines[Math.floor(Math.random() * lines.length)];
    $('modal-text').textContent = line;
    $('modal-backdrop').classList.remove('hidden');
  });

  $('modal-close').addEventListener('click', () => {
    $('modal-backdrop').classList.add('hidden');
  });
  $('modal-backdrop').addEventListener('click', (e) => {
    if (e.target === $('modal-backdrop')) {
      $('modal-backdrop').classList.add('hidden');
    }
  });

  /* ---------- 分享链接还原结果 ---------- */
  function tryRestoreFromUrl() {
    const params = new URLSearchParams(location.search);
    const bits = params.get('r');
    if (!bits || !Scoring.isValidBits(bits)) return false;
    const decoded = Scoring.decode(bits);
    if (!decoded) return false;
    answers = decoded;
    showResult(answers);
    return true;
  }

  if (!tryRestoreFromUrl()) {
    show('home');
  }
})();
