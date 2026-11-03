/* Scroll choreography: every visual value is a continuous function of scroll position.
   Nothing is toggled by class, so nothing ever snaps. Stages pin to the screen while their
   content moves, which is why the page feels like it plays rather than scrolls. */
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { root.classList.add('reduced'); return; }

  var clamp = function (x, a, b) { return Math.min(b === undefined ? 1 : b, Math.max(a === undefined ? 0 : a, x)); };
  var smooth = function (x) { x = clamp(x); return x * x * (3 - 2 * x); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var hex = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h.replace(/(.)/g, '$1$1'); var n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  var q = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var stages = [], reveals = [], paras = [], bgs = [], hscrolls = [], docH = 0, H = innerHeight, W = innerWidth;

  function measure() {
    H = innerHeight; W = innerWidth; var y = window.scrollY;
    stages = q('[data-stage]').map(function (el) {
      var r = el.getBoundingClientRect(), pin = el.querySelector('.pin'), ph = pin ? pin.getBoundingClientRect().height : H;
      return {
        el: el, top: r.top + y, range: Math.max(1, r.height - ph),
        beats: q('[data-beat]', el).map(function (b) { var w = b.getAttribute('data-beat').split(',').map(Number); return { el: b, w: w, travel: Number(b.getAttribute('data-travel') || 36) }; }),
        devs: q('[data-motion]', el).map(function (d) { return { el: d, kind: d.getAttribute('data-motion'), i: Number(d.getAttribute('data-i') || 0), n: Number(d.getAttribute('data-n') || 1) }; }),
        counts: q('[data-count]', el).map(function (c) { return { el: c, to: Number(c.getAttribute('data-count')), pre: c.getAttribute('data-pre') || '', suf: c.getAttribute('data-suf') || '' }; }),
        zooms: q('[data-zoom]', el),
        h: q('[data-track]', el)[0] || null
      };
    });
    reveals = q('[data-reveal]').map(function (el) { var r = el.getBoundingClientRect(); return { el: el, mid: r.top + y + r.height / 2 }; });
    paras = q('[data-parallax]').map(function (el) { var r = el.getBoundingClientRect(); return { el: el, mid: r.top + y + r.height / 2, k: Number(el.getAttribute('data-parallax')) }; });
    bgs = q('[data-bg]').map(function (el) { var r = el.getBoundingClientRect(); return { mid: r.top + y + r.height / 2, c: hex(el.getAttribute('data-bg')), g: (el.getAttribute('data-glow') || '43,111,208').split(',').map(Number) }; });
    docH = document.documentElement.scrollHeight;
  }

  function beatValue(p, w) {
    var a = w[0], b = w[1], c = w[2], d = w[3];
    if (p < a) return 0; if (p < b) return smooth((p - a) / (b - a)); if (p <= c) return 1; if (p < d) return 1 - smooth((p - c) / (d - c)); return 0;
  }

  function render(y) {
    var i, j, s, m, p, e, t;
    for (i = 0; i < stages.length; i++) {
      s = stages[i]; p = clamp((y - s.top) / s.range);
      if (y + H < s.top - 50 || y > s.top + s.range + H + 50) continue;
      s.el.style.setProperty('--p', p.toFixed(4));
      for (j = 0; j < s.beats.length; j++) {
        m = s.beats[j]; e = beatValue(p, m.w);
        t = clamp((p - m.w[0]) / Math.max(0.0001, m.w[3] - m.w[0]));
        m.el.style.setProperty('--v', e.toFixed(3));
        m.el.style.setProperty('--ty', ((0.5 - t) * 2 * m.travel).toFixed(1));
        m.el.style.pointerEvents = e > 0.6 ? 'auto' : 'none';
      }
      for (j = 0; j < s.devs.length; j++) device(s.devs[j], p);
      for (j = 0; j < s.counts.length; j++) { m = s.counts[j]; m.el.textContent = m.pre + Math.round(m.to * smooth(p / 0.55)) + m.suf; }
      for (j = 0; j < s.zooms.length; j++) { e = smooth(p); s.zooms[j].style.transform = 'scale(' + lerp(0.62, 1.14, e).toFixed(3) + ')'; s.zooms[j].style.opacity = (smooth(p / 0.25) * (1 - smooth((p - 0.8) / 0.2))).toFixed(3); }
      if (s.h) { var tr = s.h, over = Math.max(0, tr.scrollWidth - W + 44); tr.style.transform = 'translate3d(' + (-over * smooth(p)).toFixed(1) + 'px,0,0)'; }
    }
    for (i = 0; i < reveals.length; i++) {
      m = reveals[i]; var pos = (m.mid - y) / H; // 1.1 = below the screen, 0.5 = centred
      m.el.style.setProperty('--r', smooth((1.02 - pos) / 0.42).toFixed(3));
    }
    for (i = 0; i < paras.length; i++) { m = paras[i]; m.el.style.transform = 'translate3d(0,' + ((m.mid - y - H / 2) * m.k).toFixed(1) + 'px,0)'; }
    colour(y);
    root.style.setProperty('--gx', (Math.sin(y / 1300) * 26).toFixed(2));
    root.style.setProperty('--gy', (Math.cos(y / 1700) * 16).toFixed(2));
  }

  function device(d, p) {
    var k = d.kind, e, x = 0, yy = 0, r = 0, rx = 0, ry = 0, sc = 1;
    if (k === 'hero') {
      e = smooth(p / 0.55);
      yy = (1 - e) * H * 0.6; sc = lerp(0.78, 1, e); rx = (1 - e) * 22; ry = lerp(0, -9, smooth((p - 0.5) / 0.5));
    } else if (k === 'fan') {
      e = smooth(p / 0.6); var o = d.i - (d.n - 1) / 2, narrow = W < 820;
      x = o * lerp(0, narrow ? W * 0.3 : Math.min(W * 0.26, 330), e); r = o * lerp(0, 7, e);
      yy = (1 - e) * H * 0.7 + Math.abs(o) * lerp(0, 26, e); sc = lerp(0.8, o === 0 ? 1.04 : 0.9, e); ry = o * lerp(0, -8, e);
    } else if (k === 'sway') {
      e = smooth(p / 0.1); var x2 = smooth((p - 0.9) / 0.1);
      sc = lerp(0.9, 1, e) * (1 - 0.06 * x2); ry = (p - 0.5) * -22; rx = Math.sin(p * Math.PI) * 5; yy = (0.5 - p) * 34;
    } else if (k === 'wide') {
      e = smooth(p / 0.12); sc = lerp(0.86, 1, e); ry = (p - 0.5) * -14; rx = lerp(10, 0, smooth(p / 0.3)); yy = (0.5 - p) * 40;
    } else if (k === 'drift') {
      var o2 = d.i - (d.n - 1) / 2; x = o2 * 40 * (p - 0.5); yy = (0.5 - p) * (60 + 30 * d.i); r = (p - 0.5) * 6 * (d.i % 2 ? 1 : -1); sc = 1;
    }
    d.el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + yy.toFixed(1) + 'px,0) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) rotate(' + r.toFixed(2) + 'deg) scale(' + sc.toFixed(3) + ')';
  }

  function colour(y) {
    if (!bgs.length) return;
    var pos = y + H * 0.5, i = 0; while (i < bgs.length - 1 && bgs[i + 1].mid <= pos) i++;
    var a = bgs[i], b = bgs[Math.min(i + 1, bgs.length - 1)];
    var t = a === b ? 0 : smooth((pos - a.mid) / Math.max(1, b.mid - a.mid));
    var c = [0, 1, 2].map(function (k) { return Math.round(lerp(a.c[k], b.c[k], t)); });
    var g = [0, 1, 2].map(function (k) { return Math.round(lerp(a.g[k], b.g[k], t)); });
    root.style.setProperty('--bg', 'rgb(' + c.join(',') + ')');
    root.style.setProperty('--glow', g.join(','));
  }

  var cur = window.scrollY, raf = 0, idle = 0;
  function tick() {
    var target = window.scrollY, d = target - cur;
    cur = Math.abs(d) < 0.08 ? target : cur + d * 0.15;
    render(cur);
    if (cur !== target) { idle = 0; raf = requestAnimationFrame(tick); }
    else if (++idle < 3) raf = requestAnimationFrame(tick); else raf = 0;
  }
  function kick() { if (!raf) { idle = 0; raf = requestAnimationFrame(tick); } }

  function init() { measure(); cur = window.scrollY; render(cur); root.classList.add('ready'); }
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', function () { measure(); kick(); });
  addEventListener('load', function () { measure(); kick(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measure(); kick(); });
  setInterval(function () { var h = document.documentElement.scrollHeight; if (h !== docH) { measure(); kick(); } }, 800);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
