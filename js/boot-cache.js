/** Quebra cache na publicação — não editar. */
(function () {
  var KEY = 'mf_build';
  fetch('./version.json?t=' + Date.now(), { cache: 'no-store' })
    .then(function (r) {
      return r.ok ? r.json() : null;
    })
    .then(function (data) {
      if (!data || !data.id || data.id === 'dev') return;
      var url = new URL(location.href);
      if (url.searchParams.get('v') === data.id) {
        try {
          localStorage.setItem(KEY, data.id);
        } catch (e) {}
        return;
      }
      url.searchParams.set('v', data.id);
      try {
        localStorage.setItem(KEY, data.id);
      } catch (e) {}
      location.replace(url.href);
    })
    .catch(function () {});
})();
