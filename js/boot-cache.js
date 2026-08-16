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
