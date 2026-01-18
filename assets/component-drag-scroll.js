// Enable drag-to-scroll for horizontal carousels (mouse + touch)
(function () {
  const selectors = [
    ".js-carousel-items",
    ".product-slideshow__slider",
    ".product-slideshow__thumbs",
    ".scrollable-x",
    "[role='list'][aria-label*='slider']"
  ];

  function enableDragScroll(el) {
    if (!el || el.dataset.dragScrollInit === "1") return;
    el.dataset.dragScrollInit = "1";

    // Only if it's actually horizontally scrollable
    const canScrollX = () => el.scrollWidth > el.clientWidth + 5;
    if (!canScrollX()) return;

    let isDown = false;
    let startX = 0;
    let startScrollLeft = 0;

    el.style.cursor = "grab";
    el.style.touchAction = "pan-y"; // allow vertical page scroll

    const onDown = (e) => {
      isDown = true;
      el.style.cursor = "grabbing";
      startX = (e.touches ? e.touches[0].pageX : e.pageX);
      startScrollLeft = el.scrollLeft;
    };

    const onMove = (e) => {
      if (!isDown) return;
      // Prevent page from selecting text while dragging
      e.preventDefault?.();
      const x = (e.touches ? e.touches[0].pageX : e.pageX);
      const walk = x - startX;
      el.scrollLeft = startScrollLeft - walk;
    };

    const onUp = () => {
      isDown = false;
      el.style.cursor = "grab";
    };

    el.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove, { passive: false });
    window.addEventListener("mouseup", onUp);

    el.addEventListener("touchstart", onDown, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onUp);
    el.addEventListener("touchcancel", onUp);
  }

  function init() {
    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach(enableDragScroll);
    });
  }

  // run now + after theme sections reload
  document.addEventListener("DOMContentLoaded", init);
  document.addEventListener("shopify:section:load", init);
})();
