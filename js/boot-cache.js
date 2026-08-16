/** Auto-update — redireciona e recarrega quando sair versão nova. */
(function () {
  var KEY = 'mf_build';
  var CHECK_MS = 45000;
  var SCROLL_ALLOW =
    '.leaflet-container,#map,.sheet-panel,.gear-scroll,.my-points-list,.users-list,.recover-box,.spots-filters,.login-screen,.login-panel,.checklist-panel';

  function canScroll(el) {
    if (!el || el === document.body || el === document.documentElement) return false;
    if (el.closest && el.closest(SCROLL_ALLOW)) return true;
    var st = window.getComputedStyle(el);
    if (
      (st.overflowY === 'auto' || st.overflowY === 'scroll') &&
      el.scrollHeight > el.clientHeight + 1
    ) {
      return true;
    }
    return canScroll(el.parentElement);
  }

  document.addEventListener(
    'touchmove',
    function (e) {
      if (canScroll(e.target)) return;
      e.preventDefault();
    },
    { passive: false },
  );

  function readStored() {
    try {
      return localStorage.getItem(KEY);
    } catch (e) {
      return null;
    }
  }

  function writeStored(id) {
    try {
      localStorage.setItem(KEY, id);
    } catch (e) {}
  }

  function clearCaches() {
    if ('caches' in window) {
      caches.keys().then(function (keys) {
        keys.forEach(function (k) {
          caches.delete(k);
        });
      });
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function (regs) {
        regs.forEach(function (r) {
          r.unregister();
        });
      });
    }
  }

  function fetchVersion() {
    return fetch('./version.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) {
      return r.ok ? r.json() : null;
    });
  }

  function applyVersion(id) {
    if (!id || id === 'dev') return false;

    var url = new URL(location.href);
    var cur = url.searchParams.get('v');
    var stored = readStored();

    if (stored === id && cur === id) {
      writeStored(id);
      return false;
    }

    clearCaches();
    writeStored(id);
    url.searchParams.set('v', id);
    location.replace(url.href);
    return true;
  }

  function check() {
    return fetchVersion()
      .then(function (data) {
        if (!data || !data.id) return;
        applyVersion(data.id);
      })
      .catch(function () {});
  }

  check();
  setInterval(check, CHECK_MS);

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') check();
  });
})();
