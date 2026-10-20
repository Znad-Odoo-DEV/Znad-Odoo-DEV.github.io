/* Mounts the Hairline figures (vendored, MIT) marked up as
   <div class="hairline" data-figure="terrain" data-intensity=".35" aria-hidden="true"></div>
   A figure is drawn only while it is near the viewport and removed when it is far from it.
   With prefers-reduced-motion it stays still: no self-play. No network: the library is in assets/vendor. */
const VERSION = "0.5.1";
const hosts = document.querySelectorAll(".hairline[data-figure]");

if (hosts.length && "IntersectionObserver" in window) {
  const lib = import(new URL("./vendor/hairline/" + VERSION + "/index.js", import.meta.url).href);
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const live = new WeakMap();

  const mount = async (el) => {
    if (live.has(el)) return;
    let mod;
    try { mod = await lib; } catch (e) { return; }
    const make = mod[el.dataset.figure];
    if (typeof make !== "function" || live.has(el)) return;
    const opts = { intensity: parseFloat(el.dataset.intensity || ".35"), play: !still.matches };
    if (el.dataset.label) opts.label = el.dataset.label;
    try { live.set(el, make(el, opts)); } catch (e) { /* decorative: fail quietly */ }
  };
  const unmount = (el) => {
    const f = live.get(el);
    if (f) { try { f.destroy(); } catch (e) {} live.delete(el); }
  };

  const io = new IntersectionObserver((entries) => {
    for (const en of entries) (en.isIntersecting ? mount : unmount)(en.target);
  }, { rootMargin: "200px 0px" });
  hosts.forEach((el) => io.observe(el));

  still.addEventListener("change", () => hosts.forEach((el) => {
    const f = live.get(el); if (f) f.update({ play: !still.matches });
  }));
}
