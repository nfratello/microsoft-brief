/* Frontier with Microsoft — share line (Design standards v1.5)
   Wires every ".fw-bar button.aka" copy-link button. Loaded from one shared
   location per repo so the copy-to-clipboard logic only has to be maintained
   in one place. */
(function () {
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
    var timer;

    function activate() {
      copyText(url).then(
        function () {
          btn.classList.add('done');
          if (label) label.textContent = 'Copied';
          clearTimeout(timer);
          timer = setTimeout(function () {
            btn.classList.remove('done');
            if (label) label.textContent = original;
          }, 1500);
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
