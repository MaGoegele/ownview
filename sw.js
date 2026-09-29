/* NetworthXray offline app shell.
 *
 * Cache-first for the shell (the page, its i18n/config data and the icon), so a
 * cold reload works offline; network-first for everything else, so live data
 * (/api/*) and any asset this list forgot still reach the network rather than
 * serving a stale copy. A failed network fetch falls back to the cache, then to
 * the cached app shell, so the app opens (empty) rather than erroring.
 *
 * Bump CACHE when the shell bytes change: install() only re-fetches the
 * precache list under a new cache name, and activate() deletes every older one.
 */
var CACHE = "nx-shell-v1";
var SHELL = [
  "./",
  "./index.html",
  "./app.html",
  "./manifest.json",
  "./icon.svg",
  "./api-base.js",
  "./brand.config.json",
  "./market.config.json",
  "./tour.config.json",
  "./i18n/runtime.js",
  "./i18n/en.json",
  "./i18n/de.json"
];

// Resolve the shell list to pathnames once so the fetch handler is a set lookup.
var SHELL_PATHS = SHELL.map(function (u) {
  return new URL(u, self.location).pathname;
});

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      // addAll rejects if any URL 404s; add each so one missing optional asset
      // (e.g. api-base.js on a bare static host) does not abort the install.
      return Promise.all(SHELL.map(function (u) {
        return c.add(u).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // let cross-origin pass through

  if (SHELL_PATHS.indexOf(url.pathname) !== -1) {
    // Cache-first: the shell must be instant and available offline.
    e.respondWith(
      caches.match(req).then(function (hit) {
        return hit || fetch(req).then(function (res) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
          return res;
        }).catch(function () { return caches.match("./app.html"); });
      })
    );
    return;
  }

  // Network-first for live data and the rest, falling back to cache.
  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.status === 200 && res.type === "basic") {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) {
        return hit || caches.match("./app.html");
      });
    })
  );
});
