/* ===== 人格验牌 · 页面流程控制 ===== */

(function () {
  const $ = id => document.getElementById(id);
  const views = {
    home: $('view-home'),
    quiz: $('view-quiz'),
    computing: $('view-computing'),
    result: $('view-result'),
  };

  const SPIRIT_STYLE = {
    S1: { background: '#f9a8d4', color: '#4a044e' },
    S2: { background: '#fde047', color: '#422006' },
    S3: { background: '#fbcfe8', color: '#500724' },
    S4: { background: '#1e1b4b', color: '#c4b5fd', border: '1px solid #c4b5fd' },
  };

  const prefersMobileSave = window.matchMedia('(pointer: coarse)').matches;
  const actionLabel = () => prefersMobileSave && typeof navigator.share === 'function'
    ? '保存 / 分享卡片'
    : '下载卡片';

  let answers = [];
  let preparedCardBlob = null;

  function show(name) {
    for (const key of Object.keys(views)) views[key].classList.toggle('hidden', key !== name);
    window.scrollTo(0, 0);
  }

  /* ---------- 首页 ---------- */
  $('btn-start').addEventListener('click', () => startQuiz());

  function startQuiz() {
    answers = [];
    history.replaceState(null, '', location.pathname);
    show('quiz');
    renderQuestion(0);
  }

  /* ---------- 答题 ---------- */
  function renderQuestion(i) {
    const q = QUESTIONS[i];
    const inner = $('quiz-inner');
    // 重新触发动画
    inner.classList.remove('leaving');
    inner.style.animation = 'none';
    void inner.offsetWidth;
    inner.style.animation = '';

    $('progress-bar').style.width = `${(i / QUESTIONS.length) * 100}%`;
    $('quiz-step').textContent = `第 ${i + 1} 题 / 共 ${QUESTIONS.length} 题`;
    $('quiz-title').textContent = q.title;
    $('opt-a').innerHTML = `<span class="opt-key">A</span>${q.options[0]}`;
    $('opt-b').innerHTML = `<span class="opt-key">B</span>${q.options[1]}`;

    $('opt-a').onclick = () => pick(i, 'A');
    $('opt-b').onclick = () => pick(i, 'B');
  }

  function pick(i, choice) {
    answers[i] = choice;
    if (i + 1 < QUESTIONS.length) {
      const inner = $('quiz-inner');
      inner.classList.add('leaving');
      setTimeout(() => renderQuestion(i + 1), 180);
    } else {
      $('progress-bar').style.width = '100%';
      showComputing();
    }
  }

  /* ---------- 计算中动画 ---------- */
  let dotsTimer = null;
  function showComputing() {
    show('computing');
    let n = 0;
    $('dots').textContent = '';
    dotsTimer = setInterval(() => {
      n = (n + 1) % 4;
      $('dots').textContent = '...'.slice(0, n);
    }, 300);
    setTimeout(() => {
      clearInterval(dotsTimer);
      showResult(answers);
    }, 1500);
  }

  /* ---------- 结果页 ---------- */
  function showResult(ans) {
    const { circle, spirit, runnerUp, circlePct, runnerPct, reasons } = Scoring.compute(ans);
    const bits = Scoring.encode(ans);
    preparedCardBlob = null;

    // URL 更新为分享链接
    history.replaceState(null, '', `${location.pathname}?r=${bits}`);

    // 圈层决定主角色。新插画加载失败时回退到原像素角色。
    const art = $('card-art');
    $('card').className = `card spirit-${spirit}`;
    art.style.setProperty('--circle-color', TAGS[circle].color);
    art.innerHTML = '';
    const portrait = new Image();
    const downloadButton = $('btn-download');
    downloadButton.disabled = true;
    downloadButton.textContent = '插画加载中…';
    const finishArt = () => {
      prepareCardExport(downloadButton);
    };
    portrait.alt = `${TAGS[circle].name}角色插画`;
    portrait.onload = () => { art.appendChild(portrait); finishArt(); };
    portrait.onerror = () => { art.innerHTML = Avatars.avatarSVG(circle); finishArt(); };
    portrait.src = `assets/avatars/${circle}.webp?v=20260721c`;

    // 标签胶囊
    const tagC = $('tag-circle');
    tagC.textContent = TAGS[circle].name;
    tagC.title = TAGS[circle].desc;
    tagC.style.cssText = `background:${TAGS[circle].color};color:#221c39`;

    const tagS = $('tag-spirit');
    tagS.textContent = TAGS[spirit].name;
    tagS.title = TAGS[spirit].desc;
    const st = SPIRIT_STYLE[spirit];
    tagS.style.cssText = `background:${st.background};color:${st.color};${st.border || ''}`;

    // 组合文案
    $('combo-line').textContent = COMBOS[`${circle}x${spirit}`] || `${TAGS[circle].desc}；${TAGS[spirit].desc}`;

    // 结果依据：显示主身份、次倾向与最关键的选择证据。
    $('primary-name').textContent = TAGS[circle].name;
    $('primary-pct').textContent = `${circlePct}%`;
    $('meter-fill').style.width = `${circlePct}%`;
    $('meter-track').setAttribute('aria-valuenow', String(circlePct));
    $('runner-name').textContent = TAGS[runnerUp].name;
    $('runner-pct').textContent = `${runnerPct}%`;
    $('reason-list').innerHTML = reasons.map(reason => `<li>${reason}</li>`).join('');

    // 二维码：指向测试首页（不带结果参数）
    const qrBox = $('qrcode');
    qrBox.innerHTML = '';
    new QRCode(qrBox, {
      text: location.origin + location.pathname,
      width: 96,
      height: 96,
      correctLevel: QRCode.CorrectLevel.M,
    });
    // qrcode.js 默认隐藏 Canvas、改用异步 Data URL 图片；直接展示 Canvas 可确保导出稳定。
    const qrCanvas = qrBox.querySelector('canvas');
    const qrImage = qrBox.querySelector('img');
    if (qrCanvas) qrCanvas.style.display = 'block';
    if (qrImage) qrImage.remove();

    if (prefersMobileSave) {
      document.querySelector('.share-hint').textContent = '点“保存 / 分享卡片”，可存到照片或发送给好友';
    }

    show('result');
  }

  function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG export failed')), 'image/png');
    });
  }

  async function renderCardBlob() {
    const card = $('card');
    const cardImages = Array.from(card.querySelectorAll('img'));
    await Promise.all(cardImages.map(image => {
      if (image.complete && image.naturalWidth > 0) return Promise.resolve();
      if (typeof image.decode === 'function') return image.decode().catch(() => {});
      return new Promise(resolve => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
      });
    }));

    const bounds = card.getBoundingClientRect();
    const exportWidth = Math.ceil(bounds.width);
    const exportHeight = Math.ceil(Math.max(bounds.height, card.scrollHeight)) + 2;
    const canvas = await html2canvas(card, {
      scale: Math.min(window.devicePixelRatio || 1, 2),
      width: exportWidth,
      height: exportHeight,
      windowWidth: Math.max(document.documentElement.clientWidth, exportWidth),
      windowHeight: Math.max(document.documentElement.clientHeight, exportHeight),
      scrollX: 0,
      scrollY: -window.scrollY,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      onclone: clonedDocument => {
        const clonedCard = clonedDocument.getElementById('card');
        if (!clonedCard) return;
        clonedCard.style.width = `${exportWidth}px`;
        clonedCard.style.height = `${exportHeight}px`;
        clonedCard.style.maxWidth = 'none';
        clonedCard.style.overflow = 'hidden';
      },
    });
    return canvasToBlob(canvas);
  }

  async function prepareCardExport(button) {
    button.disabled = true;
    button.textContent = '准备卡片…';
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      preparedCardBlob = await renderCardBlob();
    } catch (error) {
      preparedCardBlob = null;
    } finally {
      button.disabled = false;
      button.textContent = actionLabel();
    }
  }

  function downloadBlob(blob) {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = '人格验牌.png';
    link.href = objectUrl;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  }

  function showSavePreview(blob) {
    const objectUrl = URL.createObjectURL(blob);
    const overlay = document.createElement('div');
    overlay.className = 'save-preview';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', '保存结果卡片');
    overlay.innerHTML = `
      <div class="save-preview-inner">
        <p><strong>长按图片保存</strong><span>保存完成后点下方按钮返回</span></p>
        <img src="${objectUrl}" alt="人格验牌结果卡片">
        <button type="button">完成</button>
      </div>`;
    const close = () => {
      overlay.remove();
      document.body.classList.remove('preview-open');
      URL.revokeObjectURL(objectUrl);
    };
    overlay.querySelector('button').addEventListener('click', close);
    overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
    document.body.classList.add('preview-open');
    document.body.appendChild(overlay);
    overlay.querySelector('button').focus();
  }

  /* ---------- 保存 / 分享卡片 PNG ---------- */
  $('btn-download').addEventListener('click', async () => {
    const btn = $('btn-download');
    btn.disabled = true;
    btn.textContent = '打开中…';
    try {
      // 结果出现时已预生成，确保手机分享调用仍处于本次点击的用户手势中。
      const blob = preparedCardBlob || await renderCardBlob();
      const file = new File([blob], '人格验牌.png', { type: 'image/png' });
      const canShareFile = prefersMobileSave
        && typeof navigator.share === 'function'
        && typeof navigator.canShare === 'function'
        && navigator.canShare({ files: [file] });

      if (canShareFile) {
        try {
          await navigator.share({
            files: [file],
            title: '人格验牌',
            text: '我的人格验牌结果',
          });
        } catch (error) {
          if (error && error.name === 'AbortError') return;
          showSavePreview(blob);
        }
      } else if (prefersMobileSave) {
        showSavePreview(blob);
      } else {
        downloadBlob(blob);
      }
    } catch (e) {
      alert('生成图片失败，请长按结果卡截图保存');
    } finally {
      btn.disabled = false;
      btn.textContent = actionLabel();
    }
  });

  /* ---------- 再测一次 ---------- */
  $('btn-retry').addEventListener('click', () => startQuiz());

  /* ---------- 入口：带 ?r= 的分享链接直接展示结果 ---------- */
  const bits = new URLSearchParams(location.search).get('r');
  if (Scoring.isValidBits(bits)) {
    showResult(Scoring.decode(bits));
  } else {
    show('home');
  }
})();
