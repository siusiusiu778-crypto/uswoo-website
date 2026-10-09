/* USWOO back-to-top button: appears after scrolling down, smooth-scrolls to the top. */
(function () {
  if (window.__uswooBackToTop) return;
  window.__uswooBackToTop = true;

  function init() {
    var css = document.createElement('style');
    css.textContent =
      '.uswoo-btt{position:fixed;right:clamp(16px,2.4vw,32px);bottom:clamp(16px,2.4vw,32px);z-index:60;width:48px;height:48px;border-radius:50%;border:0;padding:0;cursor:pointer;background:#0F0F0F;color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 20px rgba(0,0,0,.22);opacity:0;visibility:hidden;transform:translateY(12px);transition:opacity .25s ease,transform .25s ease,visibility .25s,background .2s ease}' +
      '.uswoo-btt.show{opacity:1;visibility:visible;transform:none}' +
      '.uswoo-btt:hover{background:#FC8D94}' +
      '.uswoo-btt:focus-visible{outline:2px solid #FC8D94;outline-offset:3px}' +
      '.uswoo-btt svg{width:20px;height:20px;display:block}' +
      '@media (max-width:560px){.uswoo-btt{background:transparent;color:#0F0F0F;box-shadow:none;width:44px;height:44px}.uswoo-btt:hover{background:transparent;color:#FC8D94}.uswoo-btt svg{width:26px;height:26px}}' +
      '@media (prefers-reduced-motion:reduce){.uswoo-btt{transition:none}}';
    document.head.appendChild(css);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'uswoo-btt';
    btn.setAttribute('aria-label', 'Back to top');
    btn.title = 'Back to top';
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
    document.body.appendChild(btn);

    function update() {
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      btn.classList.toggle('show', y > 400);
    }
    window.addEventListener('scroll', update, { passive: true });
    update();

    btn.addEventListener('click', function () {
      var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
  }

  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init);
})();
