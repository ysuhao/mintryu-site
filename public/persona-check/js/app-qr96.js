/* Legacy script URL retained for cached pages. The canonical flow lives in app.js. */
(function () {
  const script = document.createElement('script');
  script.src = new URL('app.js', document.currentScript.src).href;
  document.head.appendChild(script);
})();
