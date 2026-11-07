/* Nudge guide: Odoo version buttons (17, 18, 19, 20).
   Plain script, no framework. Loaded only by the two Nudge pages (English and Arabic).

   Data, all under assets/nudge/:
     versions.json       which versions exist, the edition tested, "runs" (an edition it also runs on, not tested here), and "available": false for one that is "coming soon"
     version_matrix.json {"A01": {"17": "yes|no|partial|soon" ("soon": shown with Coming soon media, not listed in the edition line), "18": ..., "19": "yes", "note": "...", "note_ar": "..."}}
     version_media.json  {"18": {"A01": {"en": ["assets/nudge/guide/18/A01.webm"], "ar": [...]}}}
                         an entry is a path, or {"src": "...", "poster": "...", "caption": "..."}; paths are from the site root.
                         Besides "en" and "ar" an id can carry result_en, result_ar and partial_en, partial_ar (the line shown on a partial feature)

   The article markup is written once, for the default version (19). For another version this script hides the
   features that do not work there, swaps the media for that version's media (or a "Coming soon" box), and writes
   the matrix's note on a "partial" feature. Without JavaScript the page is the 19 page. */
(function () {
  "use strict";
  var script = document.currentScript;
  var guide = document.getElementById("guide");
  if (!script || !guide || !window.fetch || !window.URL) return;

  var AR = /^ar/i.test(document.documentElement.lang || "");
  var T = AR ? {
    group: "إصدار Odoo", soon: "قريباً", soonShort: "قريباً",
    mediaSoon: "لم يُصوَّر شرح هذه الميزة على Odoo {v} بعد.",
    soonTitle: "Odoo {v}: قريباً",
    soonBody: "دليل Nudge لإصدار Odoo {v} في الطريق. تظهر ميزاته هنا بعد اختباره.",
    note: "Odoo {v}: اختُبر على نسخة {ed}، {n}.", noteRuns: "Odoo {v}: اختُبر على نسخة {ed}، {n}، ويعمل على نسخة {run}.", noteSoon: "Odoo {v}: قريباً.",
    partial: "جزئيًا على Odoo {v}:", partialDefault: "تعمل هذه الميزة جزئيًا على Odoo {v}.", count: "{n}",
    redirected: "هذه الميزة غير متوفرة على Odoo {from}، فنعرض Odoo {to}.",
    shot: "{t}: لقطة شاشة على Odoo {v}", clip: "{t}: تسجيل على Odoo {v}",
    sections: ["", "قسم واحد", "قسمين", "ثلاثة أقسام", "أربعة أقسام", "خمسة أقسام", "ستة أقسام", "سبعة أقسام",
      "ثمانية أقسام", "تسعة أقسام", "عشرة أقسام", "أحد عشر قسمًا", "اثني عشر قسمًا"],
    and: " و", toc: "المحتويات", allPages: "كل"
  } : {
    group: "Odoo version", soon: "Coming soon", soonShort: "Soon",
    mediaSoon: "This feature has not been filmed on Odoo {v} yet.",
    soonTitle: "Odoo {v}: coming soon",
    soonBody: "The Nudge guide for Odoo {v} is on its way. Its features will appear here once they have been tested.",
    note: "Odoo {v}: tested on the {ed} edition, {n}.", noteRuns: "Odoo {v}: tested on {ed}, {n}, and running on {run}.", noteSoon: "Odoo {v}: coming soon.",
    partial: "Partial on Odoo {v}:", count: "{n}",
    redirected: "This feature is not part of Odoo {from}, so Odoo {to} is shown.",
    shot: "{t}: screenshot on Odoo {v}", clip: "{t}: recording on Odoo {v}",
    sections: ["none", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"],
    and: " and ", toc: "Contents", allPages: "all the"
  };
  /* Arabic number agreement: 1 ميزة واحدة, 2 ميزتان, 3-10 ميزات, 11+ ميزة */
  var feats = function (n) {
    if (!AR) return n + (n === 1 ? " feature" : " features");
    return n === 0 ? "لا ميزات" : n === 1 ? "ميزة واحدة" : n === 2 ? "ميزتان" : n + (n <= 10 ? " ميزات" : " ميزة");
  };
  /* in Arabic text a Latin value (Odoo 18, Community) is isolated so punctuation around it stays in place */
  var iso = { v: 1, ed: 1, run: 1, from: 1, to: 1 };
  var odoo = { v: 1, from: 1, to: 1 };
  if (AR) Object.keys(T).forEach(function (k) {
    if (typeof T[k] === "string") T[k] = T[k].replace(/Odoo \{(v|from|to)\}/g, "{$1}");
  });
  var fmt = function (s, o) {
    return s.replace(/\{(\w+)\}/g, function (m, k) {
      return o[k] == null ? m : (AR && iso[k] ? "⁦" + (odoo[k] ? "Odoo " : "") + o[k] + "⁩" : o[k]);
    });
  };
  var norm = function (id) { return String(id || "").toUpperCase().replace(/(\D)0+(\d)/g, "$1$2"); };

  var DATA = new URL("nudge/", script.src);
  var ROOT = new URL("../", script.src);
  var getJSON = function (name) {
    return fetch(new URL(name, DATA).href, { credentials: "same-origin" }).then(function (r) {
      if (!r.ok) throw new Error(name + " " + r.status);
      return r.json();
    });
  };
  var slots = Array.prototype.slice.call(document.querySelectorAll("[data-ver-slot]"));
  var dropSlots = function () { slots.forEach(function (s) { s.hidden = true; }); };

  Promise.all([getJSON("versions.json"), getJSON("version_matrix.json"), getJSON("version_media.json")])
    .then(function (d) { init(d[0], d[1], d[2]); })
    .catch(dropSlots);

  function init(cfg, matrixRaw, mediaRaw) {
    var DEF = String(cfg["default"] || "19");
    var VER = cfg.versions || {};
    var order = Object.keys(VER).sort(function (a, b) { return a - b; });
    if (order.indexOf(DEF) < 0) return dropSlots();

    var matrix = {};
    Object.keys(matrixRaw).forEach(function (k) { if (k.charAt(0) !== "_") matrix[norm(k)] = matrixRaw[k]; });
    var media = {};
    Object.keys(mediaRaw).forEach(function (v) {
      media[v] = {};
      Object.keys(mediaRaw[v] || {}).forEach(function (k) { media[v][norm(k)] = mediaRaw[v][k]; });
    });

    var cards = Array.prototype.slice.call(guide.querySelectorAll(".guide-body .feature"));
    var secs = Array.prototype.slice.call(guide.querySelectorAll(".guide-section"));
    var gSearch = document.getElementById("guide-search");
    var gCount = document.getElementById("guide-count");
    var gEmpty = document.getElementById("guide-empty");
    var filters = Array.prototype.slice.call(guide.querySelectorAll(".guide-filter"));
    var tocBtn = guide.querySelector(".toc-toggle");
    var headNums = Array.prototype.slice.call(guide.querySelectorAll("[data-vn]"));
    var headP = guide.querySelector(".guide-head p");
    var langLink = document.querySelector(".nav-tools a.lang");
    var copyBtn = document.querySelector(".copy-link[data-copy]");
    var langHref = langLink && langLink.getAttribute("href");
    var copyHref = copyBtn && copyBtn.getAttribute("data-copy");
    var current = DEF;
    var extra = "";

    var available = function (v) { return !!VER[v] && VER[v].available !== false; };
    var statusOf = function (card, v) {
      var row = matrix[norm(card.id)];
      var s = row && row[v];
      if (!s) s = (v === DEF) ? "yes" : "no";
      return s;
    };

    /* the version list in each feature's edition line follows the matrix (only when the matrix knows the feature) */
    cards.forEach(function (c) {
      var row = matrix[norm(c.id)], el = c.querySelector(".feature-edition");
      if (!row || !el) return;
      var vs = order.filter(function (v) { return available(v) && row[v] && row[v] !== "no" && row[v] !== "soon"; });
      if (!vs.length) return;
      var parts = el.textContent.split(" · ");
      var list = vs.length === 1 ? vs[0] : vs.slice(0, -1).join(AR ? " و" : ", ") + T.and + vs[vs.length - 1];
      parts[0] = "Odoo " + list;
      el.textContent = parts.join(" · ");
    });

    /* ---------- the buttons ---------- */
    var bars = slots.map(function (slot, i) {
      var bar = document.createElement("div");
      bar.className = "ver-bar";
      bar.setAttribute("role", "group");
      bar.setAttribute("aria-label", T.group);
      var row = document.createElement("div");
      row.className = "ver-btns";
      var btns = order.map(function (v) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "ver-btn"; b.setAttribute("data-v", v);
        b.setAttribute("aria-pressed", "false");
        b.appendChild(document.createTextNode("Odoo " + v));
        if (!available(v)) {
          var s = document.createElement("span");
          s.className = "ver-soon"; s.textContent = T.soonShort;
          b.appendChild(s);
        }
        b.addEventListener("click", function () { extra = ""; go(v, true); });
        row.appendChild(b);
        return b;
      });
      var note = document.createElement("p");
      note.className = "ver-note";
      if (i === 0) note.setAttribute("aria-live", "polite");
      bar.appendChild(row); bar.appendChild(note);
      slot.appendChild(bar);
      slot.setAttribute("data-ready", "");
      return { btns: btns, note: note };
    });

    /* ---------- the "coming soon" box for an unavailable version ---------- */
    var soonBox = document.createElement("div");
    soonBox.className = "ver-soon-box"; soonBox.hidden = true;
    soonBox.setAttribute("role", "status");
    var soonH = document.createElement("h3"), soonP = document.createElement("p");
    soonBox.appendChild(soonH); soonBox.appendChild(soonP);
    var gridEl = guide.querySelector(".guide-tools");
    if (gridEl) gridEl.parentNode.insertBefore(soonBox, gridEl);

    /* ---------- media for a version ---------- */
    var io = ("IntersectionObserver" in window) ? new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        var src = e.target.getAttribute("data-src");
        if (src) { e.target.setAttribute("preload", "metadata"); e.target.src = src; }
      });
    }, { rootMargin: "400px 0px" }) : null;

    var cleanMedia = function (c) {
      Array.prototype.slice.call(c.querySelectorAll(":scope > .ver-media")).forEach(function (n) {
        Array.prototype.slice.call(n.querySelectorAll("video")).forEach(function (vd) {
          if (io) io.unobserve(vd);
          vd.removeAttribute("src"); vd.load && vd.load();
        });
        n.remove();
      });
      Array.prototype.slice.call(c.querySelectorAll(":scope > .feature-media[data-ver-hid]")).forEach(function (f) {
        f.hidden = false; f.removeAttribute("data-ver-hid");
      });
    };
    var title = function (c) { var h = c.querySelector("h3"); return h ? h.textContent.trim() : c.id; };
    var item = function (c, v, e) {
      var o = typeof e === "string" ? { src: e } : e;
      var src = new URL(o.src, ROOT).href;
      var fig = document.createElement("figure");
      fig.className = "ver-item";
      var isVideo = /\.(webm|mp4|m4v|mov)(\?|$)/i.test(o.src);
      var m;
      if (isVideo) {
        m = document.createElement("video");
        m.controls = true; m.setAttribute("playsinline", ""); m.setAttribute("preload", "none");
        m.setAttribute("aria-label", fmt(T.clip, { t: title(c), v: v }));
        if (o.poster) m.poster = new URL(o.poster, ROOT).href;
        m.setAttribute("data-src", src);
        if (io) io.observe(m); else m.src = src;
      } else {
        m = document.createElement("img");
        m.loading = "lazy"; m.decoding = "async";
        m.alt = fmt(T.shot, { t: title(c), v: v });
        m.src = src;
      }
      fig.appendChild(m);
      if (o.caption) { var cap = document.createElement("figcaption"); cap.textContent = o.caption; fig.appendChild(cap); }
      return fig;
    };
    var buildMedia = function (c, v) {
      cleanMedia(c);
      if (v === DEF) return;
      var origs = Array.prototype.slice.call(c.querySelectorAll(":scope > .feature-media"));
      var e = media[v] && media[v][norm(c.id)];
      var list = e && (e[AR ? "ar" : "en"] || []);
      if (!origs.length && !(list && list.length)) return;
      var wrap = document.createElement("div");
      wrap.className = "feature-media ver-media" + (origs[0] && origs[0].classList.contains("portrait") ? " portrait" : "");
      if (list && list.length) {
        list.forEach(function (x) { wrap.appendChild(item(c, v, x)); });
      } else {
        var m0 = origs[0] && origs[0].querySelector("img,video");
        var w = m0 && +m0.getAttribute("width"), h = m0 && +m0.getAttribute("height");
        var ph = document.createElement("div");
        ph.className = "ver-ph"; ph.setAttribute("role", "img");
        ph.setAttribute("aria-label", T.soon + ": " + fmt(T.mediaSoon, { v: v }));
        if (w && h) ph.style.aspectRatio = w + " / " + h;
        var b = document.createElement("b"); b.textContent = T.soon;
        var p = document.createElement("span"); p.textContent = fmt(T.mediaSoon, { v: v });
        ph.appendChild(b); ph.appendChild(p);
        wrap.appendChild(ph);
      }
      if (origs.length) {
        origs.forEach(function (f) { f.hidden = true; f.setAttribute("data-ver-hid", ""); });
        origs[0].parentNode.insertBefore(wrap, origs[0]);
      } else {
        var hs = c.querySelectorAll(":scope > h4"), last = hs[hs.length - 1];
        c.insertBefore(wrap, last || null);
      }
    };

    var partialNote = function (c, v, st) {
      var old = c.querySelector(":scope > .feature-vnote");
      if (old) old.remove();
      if (st !== "partial") return;
      var row = matrix[norm(c.id)] || {};
      var own = media[v] && media[v][norm(c.id)];
      own = own && own[AR ? "partial_ar" : "partial_en"];
      var txt = own || (AR ? (row.note_ar || fmt(T.partialDefault, { v: v })) : row.note);
      if (!txt) return;
      var p = document.createElement("p");
      p.className = "feature-vnote";
      var s = document.createElement("strong");
      s.textContent = fmt(T.partial, { v: v }) + " ";
      p.appendChild(s); p.appendChild(document.createTextNode(txt));
      var what = c.querySelector(":scope > .feature-what");
      if (what) what.parentNode.insertBefore(p, what.nextSibling); else c.insertBefore(p, c.firstChild);
    };

    /* The written result is of a trial on Odoo 19: under another version it shows only that version's own result,
       from the manifest (result_en, result_ar), or nothing until the feature is filmed there. */
    var trialResult = function (c, v) {
      var res = c.querySelector(":scope > .feature-result");
      if (!res) return;
      var head = res.previousElementSibling;
      if (!res.hasAttribute("data-ver-orig")) res.setAttribute("data-ver-orig", res.innerHTML);
      var e = media[v] && media[v][norm(c.id)];
      var own = v === DEF ? res.getAttribute("data-ver-orig") : e && e[AR ? "result_ar" : "result_en"];
      if (v === DEF) { res.innerHTML = own; }
      else if (own) { res.textContent = own; }
      res.hidden = !own;
      if (head && head.tagName === "H4") head.hidden = !own;
    };

    /* ---------- apply a version ---------- */
    var total = cards.length;
    var apply = function (v) {
      var soon = !available(v);
      guide.classList.toggle("ver-soon", soon);
      var n = 0;
      cards.forEach(function (c) {
        var st = soon ? "no" : statusOf(c, v);
        var off = st === "no";
        c.classList.toggle("ver-off", off);
        if (!off) { n++; }
        if (off || soon) { cleanMedia(c); partialNote(c, v, ""); }
        else { buildMedia(c, v); partialNote(c, v, st); }
        trialResult(c, v);
      });
      total = n;
      var live = 0;
      secs.forEach(function (s) {
        var any = !!s.querySelector(".feature:not(.ver-off)");
        s.classList.toggle("ver-off", !any);
        if (any) live++;
        var f = guide.querySelector('.guide-filter[data-sec="' + s.getAttribute("data-sec") + '"]');
        if (f) f.hidden = !any;
      });
      Array.prototype.slice.call(guide.querySelectorAll(".guide-toc a[href^='#']")).forEach(function (a) {
        var t = document.getElementById(decodeURIComponent(a.getAttribute("href").slice(1)));
        var li = a.parentNode;
        if (t && li.tagName === "LI") li.hidden = t.classList.contains("ver-off");
      });
      /* a section filter that no longer has features goes back to All */
      var pressed = filters.filter(function (f) { return f.getAttribute("aria-pressed") === "true"; })[0];
      if (pressed && pressed.hidden) { var all = filters.filter(function (f) { return f.getAttribute("data-sec") === "0"; })[0]; if (all) all.click(); }
      if (tocBtn) tocBtn.textContent = tocBtn.textContent.replace(/\d+\s*$/, String(n));
      headNums.forEach(function (el) {
        el.textContent = el.getAttribute("data-vn") === "n" ? String(n) : T.sections[Math.min(live, 12)];
      });
      /* the built-in documentation feature: its title and page count are those of the selected version */
      Array.prototype.slice.call(document.querySelectorAll("[data-vdoc]")).forEach(function (el) { el.textContent = v; });
      var pg = VER[v] && VER[v].docPages;
      Array.prototype.slice.call(document.querySelectorAll("[data-vpages]")).forEach(function (el) { el.textContent = pg ? String(pg) : T.allPages; });
      if (headP) headP.hidden = soon;
      if (gCount) gCount.setAttribute("data-total", String(n));
      soonBox.hidden = !soon;
      soonH.textContent = fmt(T.soonTitle, { v: v });
      soonP.textContent = fmt(T.soonBody, { v: v });
      recount();
      bars.forEach(function (b) {
        b.btns.forEach(function (x) { x.setAttribute("aria-pressed", x.getAttribute("data-v") === v ? "true" : "false"); });
        b.note.textContent = (soon ? fmt(T.noteSoon, { v: v }) : fmt((VER[v] && VER[v].runs) ? T.noteRuns : T.note, { v: v, ed: (VER[v] && VER[v].edition) || "Community", run: VER[v] && VER[v].runs, n: feats(n) })) + (extra ? " " + extra : "");
      });
      var q = v === DEF ? "" : "?v=" + v;
      if (langLink && langHref) langLink.setAttribute("href", langHref.replace(/\?.*$/, "") + q);
      if (copyBtn && copyHref) copyBtn.setAttribute("data-copy", copyHref.replace(/\?.*$/, "") + q);
      current = v;
    };

    /* count and empty message follow the version, after the search/section filter of site.js has run */
    function recount() {
      if (!gCount) return;
      var shown = cards.filter(function (c) { return !c.hidden && !c.classList.contains("ver-off"); }).length;
      var act = filters.filter(function (f) { return f.getAttribute("aria-pressed") === "true"; })[0];
      var filtered = (gSearch && gSearch.value.trim()) || (act && act.getAttribute("data-sec") !== "0");
      gCount.textContent = filtered ? AR ? shown + " من " + total + (total >= 3 && total <= 10 ? " ميزات" : total === 2 ? " ميزتين" : " ميزة") : fmt(gCount.getAttribute("data-fmt"), { n: shown, t: total }) : fmt(T.count, { n: feats(total) });
      if (gEmpty) gEmpty.hidden = guide.classList.contains("ver-soon") || shown !== 0;
    }
    var later = function () { setTimeout(recount, 0); };
    if (gSearch) gSearch.addEventListener("input", later);
    filters.forEach(function (f) { f.addEventListener("click", later); });
    window.addEventListener("hashchange", function () { later(); ensureHash(false); });

    /* ---------- the URL ---------- */
    var fromURL = function () {
      var v = new URLSearchParams(location.search).get("v");
      return v && VER[v] ? v : DEF;
    };
    function go(v, push, replace) {
      if (v === current && !replace) return;
      var u = new URL(location.href);
      if (v === DEF) u.searchParams.delete("v"); else u.searchParams.set("v", v);
      if (push) history.pushState({ v: v }, "", u.href);
      else if (replace) history.replaceState({ v: v }, "", u.href);
      apply(v);
    }
    window.addEventListener("popstate", function () { extra = ""; apply(fromURL()); ensureHash(false); });

    /* an anchor to a feature that this version does not have: show the nearest version that has it */
    function ensureHash(initial) {
      var id = decodeURIComponent((location.hash || "").slice(1));
      var el = id && document.getElementById(id);
      if (!el || !guide.contains(el)) return;
      var off = guide.classList.contains("ver-soon") || el.classList.contains("ver-off") || (el.closest && el.closest(".ver-off"));
      if (off) {
        var cs = el.classList.contains("feature") ? [el] : Array.prototype.slice.call(el.querySelectorAll(".feature"));
        var alt = [DEF].concat(order.slice().reverse()).filter(function (v) {
          return available(v) && cs.some(function (c) { return statusOf(c, v) !== "no"; });
        })[0];
        if (!alt || alt === current) return;
        var from = current;
        extra = fmt(T.redirected, { from: from, to: alt });
        go(alt, false, true);
      }
      if (initial || off) el.scrollIntoView();
    }

    var start = fromURL();
    apply(start);
    ensureHash(true);
  }
})();
