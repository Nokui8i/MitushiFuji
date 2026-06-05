/**
 * Mitushi / Blum theme core — minimal runtime required by component-cart.js,
 * cart notification, dialogs, and Shopify AJAX cart flows.
 */
(function () {
  const H = (window.SHTHelper = window.SHTHelper || {});

  H.fetchConfigJSON = {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "same-origin",
  };

  H.fetchConfigHTTP = {
    method: "POST",
    headers: { Accept: "application/json" },
    credentials: "same-origin",
  };

  H.debounce = function (fn, wait) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  };

  H.formatMoney = function (cents, format) {
    if (typeof cents !== "number") cents = parseInt(cents, 10) || 0;
    const value = (cents / 100).toFixed(2);
    const template = format || window.theme_variables?.settings?.money_format || "${{amount}}";
    const amount = template.includes("amount_no_decimals")
      ? String(Math.round(cents / 100))
      : value;
    return template
      .replace(/\{\{\s*amount_no_decimals_with_comma_separator\s*\}\}/g, amount)
      .replace(/\{\{\s*amount_with_comma_separator\s*\}\}/g, amount)
      .replace(/\{\{\s*amount_no_decimals\s*\}\}/g, amount)
      .replace(/\{\{\s*amount\s*\}\}/g, amount);
  };

  class SHTCustomComponent extends HTMLElement {
    $(selector) {
      return this.querySelector(selector);
    }
    $$(selector) {
      return this.querySelectorAll(selector);
    }
    static enhancePaymentButtons(container) {
      if (!container) return;
      container.querySelectorAll(".shopify-payment-button__button").forEach((btn) => {
        btn.classList.add("btn", "btn-primary--animate", "w-100");
      });
    }
  }
  window.SHTCustomComponent = SHTCustomComponent;

  class SHTCoreDrawer extends SHTCustomComponent {
    openDrawer(opener) {
      this.classList.add("active");
      this.removeAttribute("hidden");
      this.setAttribute("aria-hidden", "false");
      this._opener = opener;
      document.body.classList.add("drawer-open");
    }
    closeDrawer() {
      this.classList.remove("active");
      this.setAttribute("hidden", "");
      this.setAttribute("aria-hidden", "true");
      document.body.classList.remove("drawer-open");
      this._opener?.focus?.();
    }
  }
  window.SHTCoreDrawer = SHTCoreDrawer;

  class SHTQuantityInput extends SHTCustomComponent {
    connectedCallback() {
      this.input = this.querySelector(".js-quantity-input");
      if (!this.input) return;
      this.changeEvent = new Event("change", { bubbles: true });
      this.querySelectorAll(".js-quantity-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => this.onButtonClick(e));
      });
    }
    onButtonClick(e) {
      e.preventDefault();
      const btn = e.currentTarget;
      const prev = this.input.value;
      if (btn.dataset.name === "plus") {
        this.input.stepUp();
      } else {
        this.input.stepDown();
      }
      if (this.input.value !== prev) {
        this.input.dispatchEvent(this.changeEvent);
      }
    }
  }

  class SHTImageATF extends HTMLElement {
    connectedCallback() {
      const markLoaded = () => this.classList.add("image-loader--loaded");
      const imgs = this.querySelectorAll("img");
      if (!imgs.length) {
        markLoaded();
        return;
      }
      let pending = imgs.length;
      const done = () => {
        pending -= 1;
        if (pending <= 0) markLoaded();
      };
      imgs.forEach((img) => {
        if (img.complete) done();
        else {
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        }
      });
      setTimeout(markLoaded, 4000);
    }
  }

  window.SHTElementLazyLoad = function SHTElementLazyLoad() {
    document.querySelectorAll("sht-image-atf.image-loader:not(.image-loader--loaded)").forEach((el) => {
      const imgs = el.querySelectorAll("img");
      if (!imgs.length || Array.from(imgs).every((img) => img.complete)) {
        el.classList.add("image-loader--loaded");
      }
    });
  };

  function parseSectionHTML(html, selector) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const node = selector ? doc.querySelector(selector) : doc.body.firstElementChild;
    return node ? node.innerHTML : html;
  }

  class SHTCartNotification extends SHTCustomComponent {
    connectedCallback() {
      this.contentEl = this.querySelector(".js-cart-notification-panel-content");
      this.countEl = this.querySelector(".js-cart-notification-panel-item-count-content");
      this.closeBtn = this.querySelector(".js-cart-notification-panel-close-btn");
      this.closeBtn?.addEventListener("click", () => this.close());
      window.cartNotificationPanel = this;
    }

    getSectionsToRender() {
      return [
        {
          id: "cart-notification-panel-product",
          section: "cart-notification-panel-product",
          selector: ".shopify-section",
        },
      ];
    }

    getSectionInnerHTML(html, selector) {
      return parseSectionHTML(html, selector);
    }

    renderContents(response, shouldOpen = true, focusEl) {
      if (!response) return;

      const sections = response.sections || {};
      this.getSectionsToRender().forEach((entry) => {
        const html = sections[entry.section];
        if (!html || !this.contentEl) return;
        this.contentEl.innerHTML = this.getSectionInnerHTML(html, entry.selector);
      });

      const count = response.item_count ?? response.items?.length ?? 0;
      if (this.countEl) this.countEl.textContent = String(count);

      const freeShip = this.querySelector(".js-cart-notification-free-shipping");
      if (freeShip && sections["cart-notification-panel-product"]) {
        const doc = new DOMParser().parseFromString(
          sections["cart-notification-panel-product"],
          "text/html"
        );
        const ship = doc.querySelector(".free-shipping-notification");
        if (ship) freeShip.innerHTML = ship.innerHTML;
      }

      if (shouldOpen) this.open(focusEl);
    }

    open(focusEl) {
      this.removeAttribute("hidden");
      if (focusEl) this._lastFocus = focusEl;
    }

    close() {
      this.setAttribute("hidden", "");
      this._lastFocus?.focus?.();
    }
  }

  class SHTDialog extends SHTCustomComponent {
    static _openCount = 0;
    static _scrollY = 0;

    connectedCallback() {
      this.addEventListener("click", (e) => {
        if (e.target === this || e.target.classList.contains("js-dialog-overlay")) this.close();
      });
      this.querySelectorAll(".js-dialog-close-btn").forEach((btn) => {
        btn.addEventListener("click", () => this.close());
      });
      this._onTouchMove = (e) => {
        if (e.target.closest(".mitushi-size-guide__table-wrap, .js-dialog-body")) return;
        if (e.target === this) e.preventDefault();
      };
      this.addEventListener("touchmove", this._onTouchMove, { passive: false });
      const id = this.id;
      if (id) window[id] = this;
    }
    _lockPageScroll() {
      if (SHTDialog._openCount === 0) {
        SHTDialog._scrollY = window.scrollY || document.documentElement.scrollTop || 0;
        document.body.style.position = "fixed";
        document.body.style.top = `-${SHTDialog._scrollY}px`;
        document.body.style.left = "0";
        document.body.style.right = "0";
        document.body.style.width = "100%";
        document.documentElement.style.overflow = "hidden";
      }
      SHTDialog._openCount += 1;
      document.body.classList.add("dialog-open");
    }
    _unlockPageScroll() {
      SHTDialog._openCount = Math.max(0, SHTDialog._openCount - 1);
      if (SHTDialog._openCount === 0) {
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.right = "";
        document.body.style.width = "";
        document.documentElement.style.overflow = "";
        document.body.classList.remove("dialog-open");
        window.scrollTo(0, SHTDialog._scrollY);
      }
    }
    open(opener) {
      const body = this.querySelector(".js-dialog-body");
      if (body && !body.dataset.rendered) {
        const tpl = body.querySelector("template");
        if (tpl?.content) {
          body.appendChild(tpl.content.cloneNode(true));
          body.dataset.rendered = "true";
        }
      }
      this.removeAttribute("hidden");
      this._opener = opener;
      this._lockPageScroll();
      this.dispatchEvent(new CustomEvent("opening", { detail: { opener }, bubbles: true }));
    }
    close() {
      this.setAttribute("hidden", "");
      this._unlockPageScroll();
      this.dispatchEvent(new CustomEvent("closing", { bubbles: true }));
      this._opener?.focus?.();
    }
  }

  class SHTDialogOpenBtn extends HTMLElement {
    connectedCallback() {
      this.addEventListener("click", (e) => {
        e.preventDefault();
        const id = this.dataset.dialogId;
        const dialog = id ? document.getElementById(id) : null;
        if (dialog?.open) dialog.open(this.querySelector("button") || this);
        else if (dialog instanceof SHTDialog) dialog.open(this);
      });
    }
  }

  const registry = [
    ["sht-cart-noti", SHTCartNotification],
    ["sht-qty-inp", SHTQuantityInput],
    ["sht-image-atf", SHTImageATF],
    ["sht-dialog", SHTDialog],
    ["sht-dialog-open-btn", SHTDialogOpenBtn],
    ["sht-header", class extends HTMLElement {}],
    ["sht-sticky-header", class extends HTMLElement {}],
    ["sht-cart-drwr", class extends SHTCustomComponent {}],
    ["sht-cart-drwr-frm", class extends SHTCustomComponent {
      renderContents() {}
    }],
    ["sht-cart-drwr-qty-inp", class extends SHTCustomComponent {}],
    ["sht-cart-drwr-rmv-btn", class extends SHTCustomComponent {}],
    ["sht-cart-drwr-note", class extends SHTCustomComponent {}],
    ["sht-carousel", class extends SHTCustomComponent {}],
    ["sht-carousel-itm", class extends HTMLElement {}],
    ["sht-carousel-wrapper", class extends HTMLElement {}],
    ["sht-carousel-trig", class extends HTMLElement {}],
    ["sht-tabs", class extends HTMLElement {}],
    ["sht-prd-slideshow", class extends SHTCustomComponent {
      bindEventHandlers() {}
      pauseAllVideo() {}
    }],
    ["sht-select", class extends HTMLElement {}],
    ["sht-localization", class extends HTMLElement {}],
    ["sht-menu-drwer-opner", class extends HTMLElement {}],
    ["sht-menu-header", class extends HTMLElement {}],
    ["sht-coll-prd-fltr-frm-rgn", class extends HTMLElement {}],
    ["sht-srch-fltr-frm", class extends SHTCustomComponent {}],
    ["sht-srch-fltr-frm-rst", class extends HTMLElement {}],
    ["sht-srch-fltr-frm-rgn", class extends HTMLElement {}],
    ["sht-adv-fltr-price-rgn-slider", class extends HTMLElement {}],
    ["sht-clps-rgn", class extends HTMLElement {}],
    ["sht-shape-parallax", class extends HTMLElement {}],
    ["sht-load-video", class extends HTMLElement {}],
    ["sht-load-media", class extends HTMLElement {}],
    ["sht-marquee-section", class extends HTMLElement {}],
    ["sht-countdown", class extends HTMLElement {}],
    ["sht-infinity-scroll", class extends HTMLElement {}],
    ["sht-hotspot", class extends HTMLElement {}],
    ["sht-grid", class extends HTMLElement {}],
    ["sht-horiz-carousel", class extends HTMLElement {}],
    ["sht-horiz-carousel-itm", class extends HTMLElement {}],
    ["sht-horizoltal-carousel", class extends HTMLElement {}],
    ["sht-vert-carousel-itm", class extends HTMLElement {}],
    ["sht-variant-swtch", class extends HTMLElement {}],
    ["sht-featured-variant-selects", class extends HTMLElement {}],
    ["sht-quick-view-variant-swatch-select", class extends HTMLElement {}],
    ["sht-prd-variant-swtch-w-select", class extends HTMLElement {}],
  ];

  registry.forEach(([name, cls]) => {
    if (!customElements.get(name)) customElements.define(name, cls);
  });

  function bootImages() {
    window.SHTElementLazyLoad();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootImages);
  } else {
    bootImages();
  }
  window.addEventListener("load", bootImages);
})();
