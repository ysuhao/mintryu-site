/* 渲染逻辑 / 렌더링 로직 — 文字内容请改 content.js */
(function () {
  var C = window.CONTENT;
  var lang = "ko";
  var requested = new URLSearchParams(location.search).get("lang");
  try { var saved = localStorage.getItem("bm-lang"); if (saved && C[saved]) lang = saved; } catch (e) {}

  if (requested && C[requested]) lang = requested;

  var $ = function (s) { return document.querySelector(s); };
  var openId = null, lastFocus = null;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }

  function render() {
    var d = C[lang];
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "ko";
    $("#eyebrow").textContent = d.ui.eyebrow;
    $("#title").textContent = d.title;
    $("#sub").textContent = d.sub;
    $("#classification").textContent = d.classification;
    $("#team-photo").alt = d.photo.alt;
    $("#photo-caption").textContent = d.photo.caption;
    $("#photo-source").textContent = d.photo.source + " ↗";
    $("#footer-src").innerHTML = esc(d.ui.sources) + ": " + d.sources.map(function (source) { return '<a class="source-link" href="' + esc(source.url) + '" target="_blank" rel="noopener noreferrer">' + esc(source.label) + ' ↗</a>'; }).join(" · ");
    $("#back-link").textContent = lang === "zh" ? "发表目录 ↗" : "발표 목록 ↗";
    $("#home-link").textContent = lang === "zh" ? "主页 ↗" : "홈 ↗";
    document.title = (lang === "zh" ? "Yext 商业模式分析" : "Yext 비즈니스모델 분석") + " · 고려대학교";
    $("#footer-org").textContent = d.footer;
    document.querySelectorAll(".lang button").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.lang === lang));
    });

    $("#tiles").innerHTML = d.tiles.map(function (t) {
      return '<article class="tile">' +
        '<div class="tag"><b>' + esc(t.no) + '</b><span>' + esc(t.label) + '</span></div>' +
        '<h2>' + esc(t.headline) + '</h2>' +
        (t.image ? '<figure class="product-photo"><img src="' + esc(t.image.src) + '" width="1000" height="563" alt="' + esc(t.image.alt) + '" loading="lazy"><figcaption>' + esc(t.image.caption) + '</figcaption></figure>' : '') +
        (t.stat ? '<div class="stat">' + esc(t.stat) + '</div><p class="stat-note">' + esc(t.statNote) + '</p>' : '') +
        '<div class="summary">' + t.summary + '</div>' +
        '<button type="button" class="more" data-id="' + esc(t.id) + '" aria-haspopup="dialog" aria-controls="sheet" aria-label="' + esc(t.headline + ' · ' + d.ui.open) + '"><span class="more-icon" aria-hidden="true">+</span></button>' +
      '</article>';
    }).join("");

    if (openId) fillSheet(openId);
  }

  function fillSheet(id) {
    var d = C[lang];
    var t = d.tiles.filter(function (x) { return x.id === id; })[0];
    if (!t) return;
    var sheet = $("#sheet");
    sheet.className = "sheet" + (t.planned ? " ours" : "");
    $("#sheet-tag").innerHTML = "<b>" + esc(t.no) + "</b>" + esc(t.label);
    $("#sheet-title").textContent = t.headline;
    $("#sheet-close").textContent = d.ui.close;
    $("#sheet-body").innerHTML = (t.image ? '<figure class="detail-product"><img src="' + esc(t.image.src) + '" width="1000" height="563" alt="' + esc(t.image.alt) + '"><figcaption>' + esc(t.image.caption) + ' · <a href="https://www.yext.com/platform/listings" target="_blank" rel="noopener noreferrer">Yext ↗</a></figcaption></figure>' : "") + t.detail;
  }

  function open(id) {
    lastFocus = document.activeElement;
    openId = id;
    fillSheet(id);
    $("#scrim").hidden = false;
    $("#main").inert = true;
    $("#sitebar").inert = true;
    document.body.style.overflow = "hidden";
    $("#sheet").scrollTop = 0;
    $("#sheet-close").focus();
  }
  function close() {
    openId = null;
    $("#scrim").hidden = true;
    $("#main").inert = false;
    $("#sitebar").inert = false;
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }

  document.addEventListener("click", function (e) {
    var tile = e.target.closest(".more[data-id]");
    if (tile) return open(tile.dataset.id);
    var lb = e.target.closest(".lang button");
    if (lb) {
      lang = lb.dataset.lang;
      try { localStorage.setItem("bm-lang", lang); } catch (err) {}
      var url = new URL(location.href);
      url.searchParams.set("lang", lang);
      history.replaceState(null, "", url);
      return render();
    }
    if (e.target.id === "sheet-close" || e.target.id === "scrim") close();
  });
  document.addEventListener("keydown", function (e) {
    if (!openId) return;
    if (e.key === "Escape") { e.preventDefault(); close(); }
    if (e.key === "Tab") {
      var focusable = Array.from($("#sheet").querySelectorAll('button, a[href], [tabindex="0"]'));
      var first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  render();
})();
