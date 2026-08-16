/** Auto-update — redireciona e recarrega quando sair versão nova. */
(function () {
  var KEY = 'mf_build';
  var CHECK_MS = 45000;

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

  function applyVersion(id, { forceReload } = {}) {
    if (!id || id === 'dev') return false;

    var url = new URL(location.href);
    var cur = url.searchParams.get('v');
    var stored = readStored();

    if (forceReload || (stored && stored !== id) || (cur && cur !== id)) {
      clearCaches();
      writeStored(id);
      url.searchParams.set('v', id);
      location.replace(url.href);
      return true;
    }

    if (cur !== id) {
      writeStored(id);
      url.searchParams.set('v', id);
      location.replace(url.href);
      return true;
    }

    writeStored(id);
    return false;
  }

  function check(forceReload) {
    return fetchVersion()
      .then(function (data) {
        if (!data || !data.id) return;
        applyVersion(data.id, { forceReload: forceReload });
      })
      .catch(function () {});
  }

  check(false);
  setInterval(function () {
    check(true);
  }, CHECK_MS);

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') check(true);
  });
})();
