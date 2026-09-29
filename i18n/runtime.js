/* OwnView i18n runtime, shared by the app and the legal pages.
 *
 * Catalogues are plain JSON under i18n/, so adding FR/IT is a new file, not a
 * code change. EN is the default and the fallback for any missing key. The
 * chosen language persists in localStorage.
 *
 * Usage:
 *   <script>window.OWNVIEW_BASE = "/";</script>   // for pages below the root
 *   <script src="/i18n/runtime.js"></script>
 *   OwnViewI18n.init(function(){ OwnViewI18n.applyI18n(); });
 *   OwnViewI18n.T("tax.disclaimer")
 *   OwnViewI18n.toggle()            // flips en/de, reloads, re-applies
 */
window.OwnViewI18n = (function () {
  var BASE = window.OWNVIEW_BASE || "";
  var I18N = {};
  var BRAND = "";
  var LANG = (function () {
    try { return localStorage.getItem("ownview.lang") || "en"; } catch (e) { return "en"; }
  })();

  function T(key, params) {
    var cat = I18N[LANG] || I18N.en || {};
    var s = cat[key] != null ? cat[key] : ((I18N.en || {})[key] != null ? I18N.en[key] : key);
    if (params) {
      Object.keys(params).forEach(function (k) { s = s.split("{" + k + "}").join(params[k]); });
    }
    // {brand} resolves from brand.config.json, so a rename is a data edit.
    if (BRAND && s.indexOf("{brand}") >= 0) s = s.split("{brand}").join(BRAND);
    return s;
  }

  // b2c brand from brand.config.json at the deployment root. Empty until it
  // loads, so callers must not paint the brand before loadBrand resolves.
  // The accent rides along: a rename or a recolour stays a data edit, and the
  // landing paints the same accent the app does instead of a hardcoded green.
  function loadBrand() {
    return fetch(BASE + "brand.config.json", { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        BRAND = (d && d.b2c && d.b2c.brand) || "";
        var accent = (d && d.b2c && d.b2c.accent) || "";
        if (accent) document.documentElement.style.setProperty("--pine", accent);
        return BRAND;
      })
      .catch(function () { BRAND = ""; return BRAND; });
  }

  function loadCatalogue(l) {
    return fetch(BASE + "i18n/" + l + ".json", { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (d) { I18N[l] = d; })
      .catch(function () { I18N[l] = {}; });
  }

  // Market content: the strip reads /api/market live (levels and sentiment
  // derived from the stored price table the scheduled worker keeps current, so
  // a moved level is a data refresh, not an edit here), and falls back to the
  // bundled market.config.json when the API is unreachable, so a page never
  // renders empty. News and papers stay in the config file. Cached after the
  // first fetch.
  var MARKET = null;
  function loadMarket() {
    if (MARKET) return Promise.resolve(MARKET);
    return fetch(BASE + "market.config.json", { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (d) { MARKET = d || {}; return MARKET; })
      .catch(function () { MARKET = {}; return MARKET; })
      .then(function (base) {
        // Overlay the live strip when it answers with levels; a miss keeps the
        // bundled snapshot quietly, so the page degrades, never blanks.
        return fetch(BASE + "api/market", { cache: "no-store" })
          .then(function (r) { return r.json(); })
          .then(function (live) {
            if (live && live.ok) {
              if ((live.levels || []).length) MARKET.levels = live.levels;
              if (live.sentiment) MARKET.sentiment = live.sentiment;
              if ((live.events || []).length) MARKET.events = live.events;
              MARKET.live = !!(live.levels || []).length;
            }
            return MARKET;
          })
          .catch(function () { return MARKET; });
      });
  }
  // The scheduled-events feed, kept short and sorted, from whichever source won.
  function events() { return (MARKET && MARKET.events) || []; }
  // Pick the active language's text from a {en, de} field, falling back to en.
  function loc(field) {
    if (field == null) return "";
    if (typeof field === "string") return field;
    return field[LANG] != null ? field[LANG] : (field.en || "");
  }

  function applyI18n(root) {
    (root || document).querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = T(el.getAttribute("data-i18n"));
    });
    document.documentElement.lang = LANG;
    var ll = document.getElementById("langLabel");
    if (ll) ll.textContent = T("lang.other");
  }

  function init(cb) {
    // Only "en" and the active language are prefetched; the other loads on
    // first toggle. Both directions fall back to English for missing keys.
    // Brand config loads first so {brand} resolves in the initial paint, and
    // the market config is loaded alongside it so paint() has data.
    var jobs = [loadBrand(), loadCatalogue("en"), loadMarket()];
    if (LANG !== "en") jobs.push(loadCatalogue(LANG));
    return Promise.all(jobs).then(function () { if (cb) cb(); });
  }

  function setLang(l, onApplied) {
    (I18N[l] ? Promise.resolve() : loadCatalogue(l)).then(function () {
      LANG = l;
      try { localStorage.setItem("ownview.lang", l); } catch (e) {}
      applyI18n();
      if (onApplied) onApplied();
    });
  }

  function toggle(onApplied) { setLang(LANG === "de" ? "en" : "de", onApplied); }

  return {
    T: T, applyI18n: applyI18n, loadCatalogue: loadCatalogue, loadBrand: loadBrand,
    loadMarket: loadMarket, loc: loc,
    market: function () { return MARKET || {}; },
    events: events,
    init: init, setLang: setLang, toggle: toggle,
    lang: function () { return LANG; },
    brand: function () { return BRAND; }
  };
})();
