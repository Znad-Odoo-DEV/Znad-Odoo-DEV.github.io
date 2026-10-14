/* Shared behaviour for index.html and projects/*.html. Everything here is an
   enhancement: the pages read in full without it. */
(function () {
  "use strict";
  var root = document.documentElement;
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };

  /* ---------- theme ---------- */
  var themeBtn = document.getElementById("theme");
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var set = root.getAttribute("data-theme");
      var dark = set ? set === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
      var next = dark ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
    });
  }

  /* ---------- sticky nav state ---------- */
  var nav = document.getElementById("nav");
  if (nav) {
    var onScroll = function () { nav.classList.toggle("scrolled", window.scrollY > 12); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- mobile sheet ---------- */
  var burger = document.getElementById("burger");
  var sheet = document.getElementById("sheet");
  if (burger && sheet) {
    var setMenu = function (open) {
      sheet.classList.toggle("open", open);
      sheet.setAttribute("aria-hidden", open ? "false" : "true");
      if (open) { sheet.removeAttribute("inert"); } else { sheet.setAttribute("inert", ""); }
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      document.body.classList.toggle("nav-open", open);
    };
    setMenu(false);
    burger.addEventListener("click", function () { setMenu(!sheet.classList.contains("open")); });
    sheet.addEventListener("click", function (e) { if (e.target.closest("a")) { setMenu(false); } });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && sheet.classList.contains("open")) { setMenu(false); burger.focus(); }
    });
  }

  /* ---------- active section in the nav ---------- */
  var links = Array.prototype.slice.call(document.querySelectorAll("#links a[href^='#']"));
  if (links.length && "IntersectionObserver" in window) {
    var sections = links.map(function (a) { return document.querySelector(a.getAttribute("href")); });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        links.forEach(function (a, i) {
          a.setAttribute("aria-current", sections[i] === entry.target ? "true" : "false");
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(function (s) { if (s) { spy.observe(s); } });
  }

  /* ---------- project filters ---------- */
  var filterBar = document.querySelector(".filters");
  var grid = document.querySelector(".grid-work[data-filterable]");
  if (filterBar && grid) {
    var cards = Array.prototype.slice.call(grid.querySelectorAll(".card"));
    var status = document.getElementById("filter-status");
    var apply = function (cat, label, note) {
      var shown = [];
      cards.forEach(function (card) {
        var cats = (card.getAttribute("data-cats") || "").split(" ");
        var on = cat === "all" || cats.indexOf(cat) !== -1;
        card.hidden = !on;
        card.classList.remove("span-2");
        if (on) { shown.push(card); }
      });
      /* an odd count leaves a hole in two columns: the last one takes the row */
      var narrow = shown.filter(function (c) { return !c.classList.contains("wide"); });
      if (narrow.length % 2 === 1) { narrow[narrow.length - 1].classList.add("span-2"); }
      if (status) {
        status.textContent = cat === "all"
          ? "Showing all " + shown.length + " projects."
          : "Showing " + shown.length + (shown.length === 1 ? " project" : " projects") + " in " + label + "." + (note ? " " + note : "");
      }
    };
    filterBar.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-filter]");
      if (!btn) { return; }
      each(filterBar.querySelectorAll("button[data-filter]"), function (b) {
        b.setAttribute("aria-pressed", b === btn ? "true" : "false");
      });
      apply(btn.getAttribute("data-filter"), btn.textContent.trim(), btn.getAttribute("data-note"));
    });
    apply("all", "All");
  }

  /* ---------- copy to clipboard ---------- */
  var live = document.getElementById("copy-live");
  var announce = function (text) { if (live) { live.textContent = ""; setTimeout(function () { live.textContent = text; }, 30); } };
  var writeText = function (value) {
    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
      return navigator.clipboard.writeText(value);
    }
    return Promise.reject(new Error("no clipboard"));
  };
  /* fallback: show the address selected, so a long-press or Ctrl+C takes it */
  var showFallback = function (btn, value) {
    var holder = btn.parentNode;
    var field = holder.querySelector(".copy-fallback");
    if (!field) {
      field = document.createElement("input");
      field.type = "text"; field.readOnly = true; field.className = "copy-fallback";
      field.setAttribute("aria-label", "Link to copy");
      holder.appendChild(field);
    }
    field.value = value;
    field.focus(); field.select();
    var copied = false;
    try { copied = document.execCommand("copy"); } catch (e) {}
    return copied;
  };
  var flash = function (btn, labelEl, idle, done) {
    btn.classList.add("done");
    if (labelEl) { labelEl.textContent = done; }
    clearTimeout(btn._t);
    btn._t = setTimeout(function () {
      btn.classList.remove("done");
      if (labelEl) { labelEl.textContent = idle; }
    }, 2000);
  };
  each(document.querySelectorAll(".copy-link, .copy"), function (btn) {
    var labelEl = btn.querySelector(".label");
    var idle = labelEl ? labelEl.textContent : "";
    btn.addEventListener("click", function () {
      var value = btn.getAttribute("data-copy");
      var isLink = btn.classList.contains("copy-link");
      writeText(value).then(function () {
        flash(btn, labelEl, idle, "Copied");
        announce(isLink ? "Link copied" : "Copied");
      }, function () {
        if (showFallback(btn, value)) {
          flash(btn, labelEl, idle, "Copied");
          announce(isLink ? "Link copied" : "Copied");
        } else {
          announce("Press Ctrl+C to copy the selected text");
        }
      });
    });
  });
})();
