/* USWOO mobile nav: below 760px the link row collapses into a hamburger button with a dropdown menu. */
(function () {
  if (window.__uswooMobileNav) return;
  window.__uswooMobileNav = true;

  function init() {
    var header = document.querySelector('header.nav');
    var inner = header && header.querySelector('.nav-inner');
    var links = inner && inner.querySelector('nav.links');
    if (!links) return false;
    if (inner.querySelector('.uswoo-burger')) return true;

    var css = document.getElementById('uswoo-mobile-nav-css') || document.createElement('style');
    css.id = 'uswoo-mobile-nav-css';
    css.textContent =
      '.uswoo-burger,.uswoo-menu{display:none}' +
      '@media (max-width:760px){' +
      'header.nav nav.links,header.nav .nav-cta{display:none !important}' +
      '.uswoo-burger{display:flex;align-items:center;justify-content:center;width:44px;height:44px;margin-right:-10px;padding:0;border:0;background:none;cursor:pointer;color:var(--hero-ink,#fff);transition:color .3s ease}' +
      'header.nav.scrolled .uswoo-burger,header.nav.menu-open .uswoo-burger,header.nav.uswoo-solid .uswoo-burger{color:var(--ink,#0F0F0F)}' +
      '.uswoo-burger span{position:relative;display:block;width:22px;height:2px;background:currentColor;border-radius:2px;transition:background .2s ease}' +
      '.uswoo-burger span::before,.uswoo-burger span::after{content:"";position:absolute;left:0;width:22px;height:2px;background:currentColor;border-radius:2px;transition:transform .25s ease,top .25s ease}' +
      '.uswoo-burger span::before{top:-7px}.uswoo-burger span::after{top:7px}' +
      '.menu-open .uswoo-burger span{background:transparent}' +
      '.menu-open .uswoo-burger span::before{top:0;transform:rotate(45deg)}' +
      '.menu-open .uswoo-burger span::after{top:0;transform:rotate(-45deg)}' +
      'header.nav.menu-open{background:var(--paper,#fff) !important;border-bottom:1px solid var(--line,#e5e5e5) !important}' +
      'header.nav.menu-open .lang-toggle{color:var(--ink,#0F0F0F) !important}' +
      'header.nav.menu-open .wordmark{color:var(--ink,#0F0F0F) !important}' +
      '.uswoo-menu{position:absolute;left:0;right:0;top:100%;flex-direction:column;background:var(--paper,#fff);border-bottom:1px solid var(--line,#e5e5e5);box-shadow:0 14px 30px rgba(0,0,0,.12);padding:6px clamp(20px,5vw,56px) 20px}' +
      '.menu-open .uswoo-menu{display:flex}' +
      '.uswoo-menu a{color:var(--ink,#0F0F0F);text-decoration:none;font-size:1.02rem;font-weight:500;padding:15px 0;border-bottom:1px solid var(--line,#e5e5e5)}' +
      '.uswoo-menu a.active{color:#FC8D94}' +
      '.uswoo-menu a.uswoo-menu-cta{margin-top:16px;border:0;background:#0F0F0F;color:#fff;text-align:center;font-weight:600;padding:14px 18px;border-radius:2px}' +
      '}';
    document.head.appendChild(css);

    // Pages without a dark hero (news/stories) have a light solid header: the white burger would vanish.
    var bgc = getComputedStyle(header).backgroundColor, bg = bgc.match(/[\d.]+/g) || [];
    if (bgc.indexOf('color(') === 0) bg = [bg[0] * 255, bg[1] * 255, bg[2] * 255, bg[3] === undefined ? 1 : bg[3]];
    var light = bg.length >= 3 && (+bg[0] + +bg[1] + +bg[2]) / 3 > 200 && (bg.length < 4 || +bg[3] > 0.5);
    header.classList.toggle('uswoo-solid', light);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'uswoo-burger';
    btn.setAttribute('aria-label', 'Menu');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<span></span>';
    inner.appendChild(btn);

    var old = header.querySelector('.uswoo-menu');
    if (old) old.remove();
    var menu = document.createElement('div');
    menu.className = 'uswoo-menu';
    header.appendChild(menu);

    function build() {
      menu.innerHTML = '';
      var items = links.querySelectorAll('a');
      for (var i = 0; i < items.length; i++) menu.appendChild(items[i].cloneNode(true));
      var cta = inner.querySelector('.nav-cta');
      if (cta) {
        var c = cta.cloneNode(true);
        c.className = 'uswoo-menu-cta';
        menu.appendChild(c);
      }
    }
    function setOpen(open) {
      if (open) build();
      header.classList.toggle('menu-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    btn.addEventListener('click', function () { setOpen(!header.classList.contains('menu-open')); });
    if (!window.__uswooMobileNavBound) {
    window.__uswooMobileNavBound = true;
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
    document.addEventListener('click', function (e) { if (!header.contains(e.target)) setOpen(false); });
    window.addEventListener('resize', function () { if (window.innerWidth > 760) setOpen(false); });
    }
    return true;
  }

  // The page is rendered client-side, so keep checking that the button exists.
  setInterval(init, 400);
  init();
})();
