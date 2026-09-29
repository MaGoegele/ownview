/* NetworthXray offline app shell.
 *
 * Network-first for same-origin GETs: a connected client always gets the fresh
 * bytes, and a failed fetch falls back to the cache (then to the cached app
 * shell), so the app still opens offline. Cache-first was tried first and bit
 * us: a cache-first shell serves its cached copy *forever*, so a publish that
 * changed i18n/en.json (issue #234's profile keys) never reached an installed
 * client - the page painted raw keys until the cache name changed. Freshness
 * beats a marginal speed win for a site that publishes often.
 *
 * Bump CACHE when this list changes: activate() deletes every older cache, so
 * an installed client drops a stale one on the next load.
 */
var CACHE = "nx-shell-v2";
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

// Network-first with a cache fallback. `fallback` is what to serve when both
// the network and the cache miss (the app shell, so a navigation still opens).
function netFirst(req, fallback) {
  return fetch(req).then(function (res) {
    if (res && res.status === 200 && res.type === "basic") {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(req, copy); });
    }
    return res;
  }).catch(function () {
    return caches.match(req).then(function (hit) {
      return hit || (fallback ? caches.match(fallback) : undefined);
    });
  });
}

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

  // Same strategy for the shell and everything else: fresh when online, cached
  // when offline. A navigation that misses both opens the cached app shell so
  // an install still launches (empty) rather than erroring.
  var fallback = (url.pathname.indexOf(".html") !== -1) ? undefined : "./app.html";
  e.respondWith(netFirst(req, fallback));
});
