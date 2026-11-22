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
