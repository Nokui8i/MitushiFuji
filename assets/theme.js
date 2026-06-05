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
    connectedCallback() {
      this.addEventListener("click", (e) => {
        if (e.target === this || e.target.classList.contains("js-dialog-overlay")) this.close();
      });
    }
    open(opener) {
      this.removeAttribute("hidden");
      this._opener = opener;
      document.body.classList.add("dialog-open");
      this.dispatchEvent(new CustomEvent("opening", { detail: { opener }, bubbles: true }));
    }
    close() {
      this.setAttribute("hidden", "");
      document.body.classList.remove("dialog-open");
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
    ["sht-coll-prd-drwer", class extends SHTCustomComponent {}],
    ["sht-coll-prd-fltr-frm", class extends SHTCustomComponent {}],
    ["sht-coll-prd-drwer-opner", class extends HTMLElement {}],
    ["sht-coll-prd-fltr-frm-rst", class extends HTMLElement {}],
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
})();
