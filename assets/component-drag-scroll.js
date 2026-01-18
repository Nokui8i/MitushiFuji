// FUJI - Drag/Swipe for horizontal scroll carousels (pointer-based)
// תומך ב-scrollable carousel של FUJI (לא Swiper אמיתי)
(() => {
  const SELECTORS = [
    ".product-slideshow__slider",
    ".js-carousel-items",
    ".product-slideshow__items",
    ".scrollable.scrollable-x",
    ".scrollable-x",
    "[data-ui-component*='carousel']",
    "[aria-label*='slider']"
  ];

  function isScrollableX(el) {
    return el && el.scrollWidth > el.clientWidth + 5;
  }

  function initDrag(el) {
    if (!el || el.dataset.swipeInit === "1") return;
    if (!isScrollableX(el)) return;

    el.dataset.swipeInit = "1";
    el.style.cursor = "grab";
    el.style.userSelect = "none";
    el.style.webkitUserSelect = "none";
    el.style.touchAction = "pan-y"; // allow vertical page scroll

    let dragging = false;
    let startX = 0;
    let startScrollLeft = 0;

    const onPointerDown = (e) => {
      // רק כפתור שמאל בעכבר
      if (e.pointerType === "mouse" && e.button !== 0) return;

      dragging = true;
      startX = e.clientX;
      startScrollLeft = el.scrollLeft;

      el.style.cursor = "grabbing";
      el.setPointerCapture?.(e.pointerId);

      // אם מתחילים לגרור על לינק/תמונה, לא "יקפוץ"
      e.preventDefault();
    };

    const onPointerMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      el.scrollLeft = startScrollLeft - dx;
      e.preventDefault();
    };

    const stop = () => {
      if (!dragging) return;
      dragging = false;
      el.style.cursor = "grab";
      el.releasePointerCapture?.();
    };

    el.addEventListener("pointerdown", onPointerDown, { passive: false });
    el.addEventListener("pointermove", onPointerMove, { passive: false });
    el.addEventListener("pointerup", stop);
    el.addEventListener("pointercancel", stop);
    el.addEventListener("mouseleave", stop);

    // למנוע "לחיצה" בטעות בזמן גרירה על לינקים
    el.addEventListener("click", (e) => {
      // אם הייתה גרירה משמעותית, נחסום את הקליק
      // (מניעת פתיחת מוצר כשסתם גוררים)
      if (!el.dataset._dragDx) return;
      const dx = parseFloat(el.dataset._dragDx);
      if (Math.abs(dx) > 6) {
        e.preventDefault();
        e.stopPropagation();
      }
      el.dataset._dragDx = "0";
    }, true);

    // למדוד גרירה כדי לחסום קליקים
    el.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      el.dataset._dragDx = String(e.clientX - startX);
    }, { passive: true });
  }

  function scan() {
    SELECTORS.forEach((sel) => {
      document.querySelectorAll(sel).forEach(initDrag);
    });
    
    // גם עבור custom elements של FUJI
    document.querySelectorAll("sht-carousel-wrapper").forEach((wrapper) => {
      const container = wrapper.querySelector(".scrollable-x, .js-carousel-items, .product-slideshow__items");
      if (container) {
        initDrag(container);
      }
    });
    
    // עבור product slideshow
    document.querySelectorAll("sht-prd-slideshow").forEach((slideshow) => {
      const items = slideshow.querySelector(".product-slideshow__items, .js-product-slideshow, .product-slideshow__slider");
      if (items) {
        initDrag(items);
      }
    });
  }

  // run now + after theme sections reload
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scan);
  } else {
    scan(); // run immediately if DOM already loaded
  }
  document.addEventListener("shopify:section:load", scan);
  document.addEventListener("shopify:section:reorder", scan);
  window.addEventListener("resize", scan);
})();
