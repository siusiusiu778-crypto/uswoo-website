/* USWOO language switch (EN / 中文).
 *
 * The pages are written in English. This script adds an "EN / 中文" toggle to
 * the top-right of the nav and, in Chinese mode, swaps text for the entries in
 * i18n-zh.js (window.USWOO_ZH). It works on the rendered DOM, so it also covers
 * content the pages build at runtime (City Guides cards, map labels/tooltips).
 *
 *  - Text nodes / placeholder, alt, aria-label, title attributes are looked up
 *    by their (whitespace- and quote-normalised) English text.
 *  - An element with data-zh="<html>" has its whole innerHTML swapped instead
 *    (for headings/paragraphs whose text is split across inline tags).
 *  - Anything without a dictionary entry simply stays in English.
 *
 * The choice is remembered in localStorage; ?lang=zh / ?lang=en overrides it.
 */
(function () {
  'use strict';
  var STORE_KEY = 'uswoo-lang';
  var ZH = window.USWOO_ZH || {};
  var PATTERNS = window.USWOO_ZH_PATTERNS || [];
  var ATTRS = ['placeholder', 'alt', 'aria-label', 'title'];
  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, SVG: 1, svg: 1 };

  function norm(s) {
    return s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
  }

  var dict = Object.create(null);
  Object.keys(ZH).forEach(function (k) { dict[norm(k)] = ZH[k]; });

  var lang = 'en';
  try {
    var q = new URLSearchParams(location.search).get('lang');
    if (q === 'zh' || q === 'en') { lang = q; localStorage.setItem(STORE_KEY, q); }
    else lang = localStorage.getItem(STORE_KEY) === 'zh' ? 'zh' : 'en';
  } catch (e) {}

  function lookup(core) {
    var n = norm(core);
    if (dict[n]) return dict[n];
    // leading emoji / arrows / quotes: translate the rest, keep the prefix
    var m = /^([^\p{L}\p{N}]+)([\s\S]+)$/u.exec(n);
    if (m && dict[m[2]]) return core.slice(0, core.indexOf(m[2].charAt(0))) + dict[m[2]];
    for (var i = 0; i < PATTERNS.length; i++) {
      var r = PATTERNS[i][0].exec(n);
      if (r) return PATTERNS[i][1](r, lookup);
    }
    return null;
  }

  var textStore = new WeakMap();   // text node -> {en, zh}
  var attrStore = new WeakMap();   // element   -> {attr: {en, zh}}
  var htmlStore = new WeakMap();   // [data-zh] -> original innerHTML
  var applying = false;

  function skipEl(el) {
    return !el || SKIP_TAGS[el.tagName] || el.closest('[data-i18n-skip],[data-zh]') ||
      (el.classList && el.classList.contains('leaflet-tile-pane'));
  }

  function transText(node) {
    var cur = node.nodeValue, rec = textStore.get(node);
    if (rec && cur === rec.zh) return;
    var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(cur);
    if (!m[2]) return;
    var zh = lookup(m[2]);
    if (zh) {
      var out = m[1] + zh + m[3];
      textStore.set(node, { en: cur, zh: out });
      node.nodeValue = out;
    } else if (rec) textStore.delete(node);
  }

  function transAttrs(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i];
      if (!el.hasAttribute || !el.hasAttribute(a)) continue;
      var cur = el.getAttribute(a), rec = attrStore.get(el) || {};
      if (rec[a] && cur === rec[a].zh) continue;
      var zh = cur && lookup(cur);
      if (zh) { rec[a] = { en: cur, zh: zh }; attrStore.set(el, rec); el.setAttribute(a, zh); }
    }
  }

  function transHtml(el) {
    if (htmlStore.has(el)) return;
    htmlStore.set(el, el.innerHTML);
    el.innerHTML = el.getAttribute('data-zh');
  }

  function toZh(root) {
    if (root.nodeType === 3) { if (!skipEl(root.parentElement)) transText(root); return; }
    if (root.nodeType !== 1) return;
    if (root.hasAttribute('data-zh')) { transHtml(root); }
    if (skipEl(root) && !root.hasAttribute('data-zh')) return;
    var els = [root].concat([].slice.call(root.querySelectorAll('[data-zh]')));
    els.forEach(function (el) { if (el.hasAttribute('data-zh')) { transAttrs(el); transHtml(el); } });
    var w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (n.nodeType === 1) {
          if (SKIP_TAGS[n.tagName] || n.hasAttribute('data-i18n-skip') || n.hasAttribute('data-zh') ||
              (n.classList && n.classList.contains('leaflet-tile-pane'))) return NodeFilter.FILTER_REJECT;
          transAttrs(n);
          return NodeFilter.FILTER_SKIP;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    if (root.nodeType === 1 && !skipEl(root)) transAttrs(root);
    var n, list = [];
    while ((n = w.nextNode())) list.push(n);
    list.forEach(transText);
  }

  function toEn(root) {
    var w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    var n, nodes = [], els = [];
    while ((n = w.nextNode())) (n.nodeType === 3 ? nodes : els).push(n);
    nodes.forEach(function (t) {
      var rec = textStore.get(t);
      if (rec && t.nodeValue === rec.zh) t.nodeValue = rec.en;
      textStore.delete(t);
    });
    els.forEach(function (el) {
      var rec = attrStore.get(el);
      if (rec) {
        Object.keys(rec).forEach(function (a) {
          if (el.getAttribute(a) === rec[a].zh) el.setAttribute(a, rec[a].en);
        });
        attrStore.delete(el);
      }
      if (htmlStore.has(el)) { el.innerHTML = htmlStore.get(el); htmlStore.delete(el); }
    });
  }

  var observer = null;
  function observe() {
    if (!observer) return;
    observer.observe(document.documentElement, {
      childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS
    });
  }
  var pending = [], scheduled = false;
  function flush() {
    scheduled = false;
    if (lang !== 'zh') { pending = []; return; }
    var batch = pending; pending = [];
    applying = true;
    try {
      batch.forEach(function (n) { if (n.isConnected) toZh(n); });
    } finally {
      if (observer) observer.takeRecords();
      applying = false;
    }
  }
  function queue(n) {
    pending.push(n);
    if (!scheduled) { scheduled = true; Promise.resolve().then(flush); }
  }
  function startObserver() {
    observer = new MutationObserver(function (muts) {
      if (applying || lang !== 'zh') return;
      muts.forEach(function (m) {
        if (m.type === 'childList') [].forEach.call(m.addedNodes, function (n) { queue(n); });
        else if (m.type === 'characterData') queue(m.target);
        else if (m.type === 'attributes') queue(m.target);
      });
    });
    observe();
  }

  function apply() {
    document.documentElement.setAttribute('lang', lang === 'zh' ? 'zh-CN' : 'en');
    document.documentElement.setAttribute('data-lang', lang);
    applying = true;
    try {
      if (lang === 'zh') toZh(document.body); else toEn(document.body);
    } finally {
      if (observer) observer.takeRecords();
      applying = false;
    }
  }

  function setLang(next) {
    lang = next;
    try { localStorage.setItem(STORE_KEY, next); } catch (e) {}
    apply();
    syncToggle();
  }

  /* ---- toggle button ---- */
  var CSS = [
    '.lang-toggle{display:inline-flex;align-items:center;gap:6px;flex:none;margin-left:-8px;padding:7px 12px;',
    'border:1px solid currentColor;border-radius:2px;background:transparent;color:var(--ink-soft,#656260);',
    'font:600 0.78rem/1 "Inter",-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;letter-spacing:0.02em;',
    'cursor:pointer;white-space:nowrap;opacity:0.92;transition:color 0.3s ease,opacity 0.15s ease;}',
    '.lang-toggle:hover{opacity:1}',
    '.lang-toggle span{opacity:0.5;transition:opacity 0.15s ease}',
    '.lang-toggle .sep{opacity:0.35}',
    'html[data-lang="en"] .lang-toggle [data-l="en"],html[data-lang="zh"] .lang-toggle [data-l="zh"]{opacity:1}',
    '.lang-toggle:focus-visible{outline:2px solid var(--focus,#FC8D94);outline-offset:3px}',
    '@media (max-width:640px){.lang-toggle{margin-left:0;padding:6px 9px;font-size:0.72rem}}',
    'html[lang="zh-CN"] body{font-family:"Inter","PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans SC",sans-serif}',
    'html[lang="zh-CN"] h1,html[lang="zh-CN"] h2,html[lang="zh-CN"] h3{font-family:"Poppins","PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans SC",sans-serif;letter-spacing:0}',
    'html[lang="zh-CN"] h1,html[lang="zh-CN"] h2,html[lang="zh-CN"] h3{word-break:keep-all;overflow-wrap:anywhere}',
    'html[lang="zh-CN"] .eyebrow,html[lang="zh-CN"] .ft-label{letter-spacing:0.04em}'
  ].join('');

  var toggle = null;
  function syncToggle() {
    if (!toggle) return;
    toggle.setAttribute('aria-label', lang === 'zh' ? 'Switch to English' : '切换为中文');
    toggle.setAttribute('aria-pressed', lang === 'zh' ? 'true' : 'false');
    syncColor();
  }
  // follow the nav link colour (white over the hero, dark once scrolled)
  function syncColor() {
    if (!toggle) return;
    var a = document.querySelector('header.nav nav.links a:not(.active)') || document.querySelector('header.nav nav.links a');
    if (a) toggle.style.color = getComputedStyle(a).color;
  }
  function mount() {
    var inner = document.querySelector('header.nav .nav-inner');
    if (!inner) return false;
    if (inner.querySelector('.lang-toggle')) return true;
    toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'lang-toggle';
    toggle.setAttribute('data-i18n-skip', '');
    toggle.innerHTML = '<span data-l="en">EN</span><span class="sep">/</span><span data-l="zh">中文</span>';
    toggle.addEventListener('click', function () { setLang(lang === 'zh' ? 'en' : 'zh'); });
    inner.appendChild(toggle);
    syncToggle();
    var header = inner.parentNode;
    new MutationObserver(function () { setTimeout(syncColor, 340); syncColor(); })
      .observe(header, { attributes: true, attributeFilter: ['class'] });
    return true;
  }

  function boot() {
    var st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    document.documentElement.setAttribute('data-lang', lang);
    if (lang === 'zh') document.documentElement.setAttribute('lang', 'zh-CN');
    startObserver();
    // The page is mounted by support.js (React) a moment after load; keep
    // trying until the nav exists, then keep the toggle in place.
    var tries = 0;
    (function wait() {
      if (mount()) { if (lang === 'zh') apply(); return; }
      if (++tries < 200) setTimeout(wait, 50);
    })();
    new MutationObserver(function () {
      if (!document.querySelector('.lang-toggle')) mount();
    }).observe(document.documentElement, { childList: true, subtree: true });
    window.USWOO_I18N = { setLang: setLang, get lang() { return lang; } };
    // late content (map, async renders) is handled by the observer; also re-run once on load
    window.addEventListener('load', function () { if (lang === 'zh') apply(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
