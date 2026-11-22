/* Frontier with Microsoft — share line (Design standards v1.8)
   Wires every ".fw-bar button.aka" copy-link button. Loaded from one shared
   location per repo so the copy-to-clipboard logic only has to be maintained
   in one place. */
(function () {
  var CHECK_SVG = '<svg class="akl-i" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy') ? resolve() : reject(new Error('copy command failed'));
      } catch (e) {
        reject(e);
      }
      document.body.removeChild(ta);
    });
  }

  function selectButtonText(btn) {
    var range = document.createRange();
    range.selectNodeContents(btn);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function wire(btn) {
    var url = btn.getAttribute('data-url');
    if (!url) return;
    var label = btn.querySelector('.akl');
    var original = label ? label.textContent : '';
    var originalIcon = btn.querySelector('svg.akl-i') ? btn.querySelector('svg.akl-i').outerHTML : '';
    var timer;

    // Lock in the resting width so the button never shifts the header when
    // the text/icon swap to the "Link copied" state.
    var restingWidth = btn.getBoundingClientRect().width;
    if (restingWidth) btn.style.minInlineSize = restingWidth + 'px';

    function activate() {
      copyText(url).then(
        function () {
          btn.classList.add('done');
          if (label) label.textContent = 'Link copied';
          var icon = btn.querySelector('svg.akl-i');
          if (icon) icon.outerHTML = CHECK_SVG;
          clearTimeout(timer);
          timer = setTimeout(function () {
            btn.classList.remove('done');
            if (label) label.textContent = original;
            var cur = btn.querySelector('svg.akl-i');
            if (cur && originalIcon) cur.outerHTML = originalIcon;
          }, 1600);
        },
        function () {
          // Clipboard blocked: select the text so the user can copy manually.
          selectButtonText(btn);
        }
      );
    }

    btn.addEventListener('click', activate);
  }

  function init() {
    document.querySelectorAll('.fw-bar button.aka').forEach(wire);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* Frontier with Microsoft — row highlight (Design standards v2.1)
   Draws a sliding 3px Microsoft blue bar under the active link in row 1
   (site navigation) and row 2 (section navigation), with scrollspy support
   for in-page anchor links on row 2. One shared mechanism: row 1 reads the
   `.on` class already set in each page's markup; row 2 computes it from
   each link's own href (path-prefix match, or scrollspy when the anchor
   target exists on the current page) so no per-page mapping table is
   needed. */
(function () {
  function makeBar(container) {
    var bar = document.createElement('span');
    bar.className = 'hbar';
    bar.setAttribute('aria-hidden', 'true');
    container.appendChild(bar);
    return bar;
  }

  function moveBarTo(bar, container, link) {
    if (!link) {
      bar.style.opacity = '0';
      return;
    }
    var cRect = container.getBoundingClientRect();
    var lRect = link.getBoundingClientRect();
    bar.style.opacity = '1';
    bar.style.transform = 'translateX(' + (lRect.left - cRect.left) + 'px)';
    bar.style.width = lRect.width + 'px';
  }

  function setupRow1() {
    var ghr = document.querySelector('.gh .ghr');
    var gnav = document.querySelector('.gh .gnav');
    if (!ghr || !gnav) return;
    var bar = makeBar(ghr);
    function position() {
      moveBarTo(bar, ghr, gnav.querySelector('a.on'));
    }
    position();
    window.addEventListener('resize', position);
  }

  function setupRow2() {
    var lb = document.querySelector('.gh .lb');
    var lbw = document.querySelector('.gh .lb .lbw');
    if (!lb || !lbw) return;
    var links = Array.prototype.slice.call(lbw.querySelectorAll('a')).filter(function (a) {
      return !a.classList.contains('lbt');
    });
    if (!links.length) return;
    var bar = makeBar(lbw);

    function normalize(u) {
      // Treat "...index.html" and its parent directory as the same page, and
      // drop any query string, so links written as "./" or "./#id" match
      // whether the page was reached via a bare directory URL or an
      // explicit "index.html" URL.
      return u.split('#')[0].split('?')[0].replace(/index\.html$/, '');
    }
    var hereNoHash = normalize(location.href);

    function resolve(href) {
      try {
        return new URL(href, location.href);
      } catch (e) {
        return null;
      }
    }

    var pathMatch = null;
    links.forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href || href.indexOf('#') !== -1) return;
      var u = resolve(href);
      if (!u) return;
      var base = normalize(u.href);
      if (hereNoHash === base || hereNoHash.indexOf(base) === 0) {
        if (!pathMatch || base.length > pathMatch.base.length) pathMatch = { a: a, base: base };
      }
    });

    var spies = [];
    links.forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href) return;
      var hashIdx = href.indexOf('#');
      if (hashIdx === -1) return;
      var id = href.slice(hashIdx + 1);
      if (!id) return;
      var baseHref = href.slice(0, hashIdx);
      var u = baseHref ? resolve(baseHref) : null;
      var baseResolved = u ? normalize(u.href) : hereNoHash;
      if (baseResolved !== hereNoHash) return;
      var target = document.getElementById(id);
      if (!target) return;
      // Observe the whole section (not just its small heading) so the bar
      // tracks "the section currently in view", not a brief flash as a
      // one-line heading passes through the viewport.
      var observed = target.closest('section') || target;
      spies.push({ a: a, target: observed, id: id });
    });

    var current = null;
    function activate(a) {
      links.forEach(function (l) {
        l.classList.remove('on');
        l.removeAttribute('aria-current');
      });
      if (a) {
        a.classList.add('on');
        a.setAttribute('aria-current', 'location');
      }
      current = a;
      moveBarTo(bar, lbw, a);
      if (a) {
        // Scroll row 2's own horizontal strip only (never the page) so the
        // active link is visible even when row 2 scrolls sideways on phones.
        var lbwRect = lbw.getBoundingClientRect();
        var aRect = a.getBoundingClientRect();
        if (aRect.left < lbwRect.left) {
          lbw.scrollLeft -= (lbwRect.left - aRect.left) + 16;
        } else if (aRect.right > lbwRect.right) {
          lbw.scrollLeft += (aRect.right - lbwRect.right) + 16;
        }
      }
    }

    if (location.hash) {
      var hashSpy = spies.filter(function (s) { return s.id === location.hash.slice(1); })[0];
      if (hashSpy) activate(hashSpy.a);
      else if (pathMatch) activate(pathMatch.a);
      else activate(null);
    } else if (pathMatch) {
      activate(pathMatch.a);
    } else {
      activate(null);
    }

    links.forEach(function (a) {
      a.addEventListener('click', function () {
        var href = a.getAttribute('href') || '';
        var hashIdx = href.indexOf('#');
        if (hashIdx >= 0) {
          var id = href.slice(hashIdx + 1);
          var spy = spies.filter(function (s) { return s.id === id; })[0];
          if (spy) activate(a);
        }
      });
    });

    if (spies.length && 'IntersectionObserver' in window) {
      function recompute() {
        var vh = window.innerHeight;
        var zoneTop = vh * 0.45;
        var zoneBottom = vh * 0.55;
        var best = null;
        spies.forEach(function (s) {
          var r = s.target.getBoundingClientRect();
          if (r.bottom > zoneTop && r.top < zoneBottom) {
            if (!best || r.top < best.top) best = { spy: s, top: r.top };
          }
        });
        if (!best) {
          if (current !== null) activate(null);
          return;
        }
        if (best.spy.a !== current) activate(best.spy.a);
      }
      var io = new IntersectionObserver(recompute, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
      spies.forEach(function (s) { io.observe(s.target); });
    }

    window.addEventListener('resize', function () { moveBarTo(bar, lbw, current); });
    lbw.addEventListener('scroll', function () { moveBarTo(bar, lbw, current); });
  }

  function init() {
    setupRow1();
    setupRow2();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
