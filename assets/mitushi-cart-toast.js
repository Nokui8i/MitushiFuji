(function () {
  const DESKTOP_MQ = window.matchMedia("(min-width: 1024px)");
  let syncPromise = null;

  function isDesktop() {
    return DESKTOP_MQ.matches;
  }

  function getCartButton() {
    return document.getElementById("mitushiCartButton");
  }

  function getBadges() {
    return document.querySelectorAll(".mitushi-cart-badge, .js-cart-form-item_count");
  }

  function formatImage(data) {
    if (!data) return "";
    if (typeof data.image === "string" && data.image) return data.image;
    if (data.featured_image?.url) return data.featured_image.url;
    if (data.featured_image?.src) return data.featured_image.src;
    return "";
  }

  function setCount(count, options = {}) {
    const safe = Math.max(0, parseInt(count, 10) || 0);

    getBadges().forEach((badge) => {
      const prev = parseInt(badge.textContent, 10) || 0;
      badge.textContent = String(safe);
      badge.classList.toggle("is-empty", safe === 0);

      if (options.animate && safe > 0 && safe !== prev) {
        badge.classList.remove("is-bump");
        void badge.offsetWidth;
        badge.classList.add("is-bump");
        window.setTimeout(() => badge.classList.remove("is-bump"), 520);
      }
    });

    document.querySelectorAll(".cart-count-number, .header__cart-count .cart-count-number").forEach((el) => {
      el.textContent = String(safe);
      const wrap = el.closest(".header__cart-count");
      if (wrap) {
        wrap.classList.toggle("opacity-0", safe === 0);
        wrap.classList.toggle("hidden-xs", safe === 0);
      }
    });
  }

  function bounceCartIcon() {
    const btn = getCartButton();
    if (!btn) return;
    btn.classList.remove("mitushi-cart-button--received");
    void btn.offsetWidth;
    btn.classList.add("mitushi-cart-button--received");
    window.setTimeout(() => btn.classList.remove("mitushi-cart-button--received"), 720);
  }

  function flyToCart(data, originEl) {
    const cartBtn = getCartButton();
    if (!cartBtn || !originEl || !isDesktop()) {
      bounceCartIcon();
      return;
    }

    const from = originEl.getBoundingClientRect();
    const to = cartBtn.getBoundingClientRect();
    if (!from.width || !to.width) {
      bounceCartIcon();
      return;
    }

    const particle = document.createElement("div");
    particle.className = "mitushi-cart-fly-particle";
    particle.setAttribute("aria-hidden", "true");

    const image = formatImage(data);
    if (image) {
      const img = document.createElement("img");
      img.src = image;
      img.alt = "";
      particle.appendChild(img);
    } else {
      particle.classList.add("mitushi-cart-fly-particle--dot");
    }

    const size = 36;
    const startX = from.left + from.width / 2 - size / 2;
    const startY = from.top + from.height / 2 - size / 2;
    const endX = to.left + to.width / 2 - size / 2;
    const endY = to.top + to.height / 2 - size / 2;

    particle.style.width = size + "px";
    particle.style.height = size + "px";
    particle.style.left = startX + "px";
    particle.style.top = startY + "px";

    document.body.appendChild(particle);

    const dx = endX - startX;
    const dy = endY - startY;

    const animation = particle.animate(
      [
        { transform: "translate(0, 0) scale(1) rotate(0deg)", opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.22) rotate(8deg)`, opacity: 0.9 },
      ],
      {
        duration: 620,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards",
      }
    );

    animation.onfinish = () => particle.remove();
    window.setTimeout(() => particle.remove(), 700);

    bounceCartIcon();
  }

  function cartJsUrl() {
    const root = window.Shopify?.routes?.root || "/";
    return (root.endsWith("/") ? root : root + "/") + "cart.js";
  }

  function syncCartCount(options = {}) {
    if (syncPromise) return syncPromise;

    syncPromise = fetch(cartJsUrl(), { credentials: "same-origin" })
      .then((res) => {
        if (res.status === 429) return null;
        return res.ok ? res.json() : null;
      })
      .then((cart) => {
        if (cart && typeof cart.item_count === "number") {
          setCount(cart.item_count, options);
          document.dispatchEvent(new CustomEvent("cart:updated", { detail: { cart } }));
        }
        return cart;
      })
      .catch(() => null)
      .finally(() => {
        syncPromise = null;
      });

    return syncPromise;
  }

  function onAdded(data, originEl) {
    if (isDesktop()) {
      flyToCart(data, originEl);
    } else {
      bounceCartIcon();
    }

    syncCartCount({ animate: true });
  }

  function patchCartNotificationPanel() {
    const panel = document.getElementById("cartNotificationPanel");
    if (!panel || panel.__mitushiFeedbackPatched) return;

    const originalRender = panel.renderContents?.bind(panel);
    if (typeof originalRender !== "function") return;

    panel.renderContents = function (response, shouldOpen, focusEl) {
      originalRender(response, false, focusEl);
      if (response) {
        onAdded(response, focusEl || getCartButton());
      }
    };

    panel.__mitushiFeedbackPatched = true;
  }

  function patchAddProductToCart() {
    if (window.addProductToCart?.__mitushiFeedbackPatched) return;

    window.addProductToCart = function (variantId, originEl) {
      if (!variantId) return;

      const root = window.Shopify?.routes?.root || "/";
      const base = root.endsWith("/") ? root : root + "/";

      fetch(base + "cart/add.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ items: [{ id: variantId, quantity: 1 }] }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.status === 422 || data?.description) return;
          onAdded(data, originEl || document.activeElement);
        })
        .catch(() => {});
    };

    window.addProductToCart.__mitushiFeedbackPatched = true;
  }

  window.MitushiCartFeedback = {
    onAdded,
    setCount,
    syncCartCount,
    isDesktop,
  };

  window.MitushiCartToast = {
    show: (data, originEl) => onAdded(data, originEl),
    hide: () => {},
    isDesktop,
  };

  function init() {
    patchCartNotificationPanel();
    patchAddProductToCart();
    syncCartCount();

    document.addEventListener("mitushi:cart-added", (event) => {
      if (event.detail) onAdded(event.detail, event.detail.originEl);
    });

    window.addEventListener("pageshow", (event) => {
      if (event.persisted) syncCartCount();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.addEventListener("load", () => {
    patchCartNotificationPanel();
    patchAddProductToCart();
    syncCartCount();
  });

  window.customElements?.whenDefined("sht-cart-noti").then(patchCartNotificationPanel);
})();
