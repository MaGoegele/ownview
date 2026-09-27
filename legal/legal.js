/* Legal page shell. One structure, three routes, all copy from the i18n
 * catalogue. Window.LEGAL_ROUTE is set by each page (imprint | privacy | terms).
 *
 * Nothing here is legal wording. Every clause is a marked placeholder the
 * legal opinion has to fill in; see REGULATORY.md.
 */
(function () {
  var T = function (k, p) { return window.OwnViewI18n.T(k, p); };

  var ROUTES = {
    imprint: {
      title: "legal.imprint.title",
      intro: "legal.imprint.intro",
      sections: [
        ["legal.imprint.operator_h", "legal.imprint.operator"],
        ["legal.imprint.register_h", "legal.imprint.register"],
        ["legal.imprint.rep_h", "legal.imprint.rep"],
        ["legal.imprint.contact_h", "legal.imprint.contact"],
        ["legal.imprint.vat_h", "legal.imprint.vat"]
      ]
    },
    privacy: {
      title: "legal.privacy.title",
      intro: "legal.privacy.intro",
      sections: [
        ["legal.privacy.data_h", "legal.privacy.data"],
        ["legal.privacy.basis_h", "legal.privacy.basis"],
        ["legal.privacy.retention_h", "legal.privacy.retention"],
        ["legal.privacy.rights_h", "legal.privacy.rights"],
        ["legal.privacy.processors_h", "legal.privacy.processors"]
      ]
    },
    terms: {
      title: "legal.terms.title",
      intro: "legal.terms.intro",
      sections: [
        ["legal.terms.service_h", "legal.terms.service"],
        ["legal.terms.noadvice_h", "legal.terms.noadvice"],
        ["legal.terms.liability_h", "legal.terms.liability"],
        ["legal.terms.law_h", "legal.terms.law"]
      ]
    }
  };

  // The two on-screen disclosures REGULATORY.md requires. tax.disclaimer is the
  // existing key, reused here rather than duplicated.
  var DISCLOSURES = [
    ["portfolio.nocall.title", "legal.disc.market"],
    ["portfolio.nocall.title", "tax.disclaimer"]
  ];

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // Turn [bracketed] spans into visible placeholder chips so a reader cannot
  // mistake them for settled text.
  function markSlots(s) {
    return esc(s).replace(/\[[^\]]+\]/g, function (m) {
      return '<span class="slot">' + m + "</span>";
    });
  }

  function render(route) {
    var spec = ROUTES[route] || ROUTES.imprint;
    document.title = T(spec.title) + " - " + window.OwnViewI18n.brand();
    var bl = document.getElementById("brandLink");
    if (bl) bl.textContent = window.OwnViewI18n.brand();
    var h = document.getElementById("legalTitle");
    if (h) h.textContent = T(spec.title);
    var intro = document.getElementById("legalIntro");
    if (intro) intro.textContent = T(spec.intro);

    var body = document.getElementById("legalBody");
    body.innerHTML = spec.sections.map(function (s) {
      return '<h2>' + esc(T(s[0])) + "</h2>" +
        '<p class="ph">' + markSlots(T(s[1])) + "</p>";
    }).join("");

    var disc = document.getElementById("legalDisc");
    disc.innerHTML = DISCLOSURES.map(function (d) {
      return '<div class="disc"><span class="lbl">' + esc(T(d[0])) + "</span>" +
        esc(T(d[1])) + "</div>";
    }).join("");
  }

  var btn = document.getElementById("langBtn");
  if (btn) {
    btn.addEventListener("click", function () { window.OwnViewI18n.toggle(repaint); });
  }

  function repaint() {
    window.OwnViewI18n.applyI18n();
    render(window.LEGAL_ROUTE);
  }

  window.OwnViewI18n.init(repaint);
})();
