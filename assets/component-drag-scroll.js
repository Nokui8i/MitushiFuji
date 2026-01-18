// Enable drag-to-scroll for horizontal carousels (mouse + touch)
// תומך ב-FUJI theme custom elements
(function () {
  const selectors = [
    ".js-carousel-items",
    ".product-slideshow__slider",
    ".product-slideshow__thumbs",
    ".product-slideshow__items",
    ".scrollable-x",
    "[role='list'][aria-label*='slider']",
    "sht-carousel-wrapper .scrollable-x",
    ".carousel-wrapper .scrollable-x",
    ".product-slideshow__items.js-product-slideshow"
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
    el.style.touchAction = "pan-x pan-y"; // allow horizontal and vertical scroll
    el.style.webkitOverflowScrolling = "touch"; // smooth scrolling on iOS

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
    
    // גם עבור custom elements של FUJI
    document.querySelectorAll("sht-carousel-wrapper").forEach((wrapper) => {
      const container = wrapper.querySelector(".scrollable-x, .js-carousel-items, .product-slideshow__items");
      if (container) {
        enableDragScroll(container);
      }
    });
    
    // עבור product slideshow
    document.querySelectorAll("sht-prd-slideshow").forEach((slideshow) => {
      const items = slideshow.querySelector(".product-slideshow__items, .js-product-slideshow");
      if (items) {
        enableDragScroll(items);
      }
    });
  }

  // run now + after theme sections reload
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init(); // run immediately if DOM already loaded
  }
  document.addEventListener("shopify:section:load", init);
  document.addEventListener("shopify:section:reorder", init);
})();
