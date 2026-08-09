/**
 * Newsletter popup runtime — restores sht-newsletter-popup after theme.js
 * was slimmed down and no longer registered the original Blum component.
 */
(function () {
  if (customElements.get("sht-newsletter-popup")) return;

  const themeName =
    (window.Shopify && Shopify.theme && Shopify.theme.name
      ? Shopify.theme.name
      : "mitushi"
    ).toLowerCase();

  class SHTNewsletterPopup extends (window.SHTCustomComponent || HTMLElement) {
    constructor() {
      super();
      this.storageKey = themeName + "-newsletter-popup-display";
      this.stickyKey = themeName + "-sticky-popup-dismissed";
      this.cartShownKey = themeName + "-cart-notification-popup-shown";
      this.bodyEl = document.body;
      this.isOpen = false;
      this.delayTimeoutId = null;
      this.contentLoaded = false;

      this.trigger = this.dataset.trigger || "delay-after-page-load";
      this.delayTime = this.dataset.delayTime || "session";
      this.delayDays = parseInt(this.dataset.delayDays || "30", 10);
      this.delayUntil = parseInt(this.dataset.delayUntil || "0", 10);
      this.showOnlyOnIndex = this.hasAttribute("data-show-only-on-index");

      this.contentContainer = this.querySelector("[data-deferred-content]");
      this.contentTemplate = this.querySelector(".js-newsletter-content-template");
      this.overlay = this.querySelector(".js-newsletter-popup-overlay");
      this.triggerBtn = document.querySelector(".js-newsletter-popup-trigger");
      this.stickyPopupEnabled = !!this.triggerBtn;

      this.onClose = this.onClose.bind(this);
      this.onTriggerClick = this.onTriggerClick.bind(this);
      this.onScroll = this.onScroll.bind(this);

      this.init();
    }

    init() {
      if (this.showOnlyOnIndex && !this.isHomePage()) return;

      this.bindEvents();

      if (this.getPopupStatus()) {
        this.initStickyPopup();
        return;
      }

      this.initTrigger();
      this.initStickyPopup();

      // Theme editor: keep popup editable when section is selected
      if (window.Shopify && Shopify.designMode) {
        document.addEventListener("shopify:section:select", (e) => {
          if (e.detail && e.detail.sectionId === this.dataset.sectionId) {
            this.togglePopup(true);
          }
        });
        document.addEventListener("shopify:section:deselect", (e) => {
          if (e.detail && e.detail.sectionId === this.dataset.sectionId) {
            this.togglePopup(false, false);
          }
        });
      }
    }

    isHomePage() {
      const path = window.location.pathname.replace(/\/+$/, "") || "/";
      return path === "/" || path === "";
    }

    bindEvents() {
      this.querySelectorAll(".js-popup-close-btn").forEach((btn) => {
        btn.addEventListener("click", this.onClose);
      });
      if (this.overlay) this.overlay.addEventListener("click", this.onClose);
      if (this.triggerBtn) this.triggerBtn.addEventListener("click", this.onTriggerClick);
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && this.hasAttribute("open")) this.onClose(e);
      });
    }

    initTrigger() {
      switch (this.trigger) {
        case "reaching-to-footer":
          window.addEventListener("scroll", this.onScroll, { passive: true });
          break;
        case "after-closing-cart-notification": {
          const cartNoti = document.querySelector("sht-cart-noti");
          if (cartNoti) {
            cartNoti.addEventListener("closed", () => {
              try {
                if (sessionStorage.getItem(this.cartShownKey) === "true") return;
                this.togglePopup(true);
                sessionStorage.setItem(this.cartShownKey, "true");
              } catch (_) {}
            });
          }
          break;
        }
        case "delay-after-page-load":
        default:
          this.delayTimeoutId = setTimeout(() => {
            try {
              if (!this.getPopupStatus()) this.togglePopup(true);
            } catch (err) {
              console.warn("Newsletter popup delay error:", err);
            }
          }, Math.max(0, this.delayUntil) * 1000);
          break;
      }
    }

    onScroll() {
      const scrollBottom = window.scrollY + window.innerHeight;
      const docHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      );
      if (scrollBottom >= docHeight - 120) {
        window.removeEventListener("scroll", this.onScroll);
        if (!this.getPopupStatus()) this.togglePopup(true);
      }
    }

    initStickyPopup() {
      if (!this.stickyPopupEnabled) return;
      this.toggleStickyPopup(false);
      if (this.getPopupStatus() && !this.getStickyDismissed()) {
        this.toggleStickyPopup(true);
      }
    }

    onTriggerClick(e) {
      e.preventDefault();
      const closeIcon = e.target.closest(".icon-close, svg");
      if (closeIcon && this.triggerBtn && this.triggerBtn.contains(closeIcon)) {
        this.setStickyDismissed(true);
        this.toggleStickyPopup(false);
        return;
      }
      this.togglePopup(true);
    }

    onClose(e) {
      if (e) e.preventDefault();
      this.togglePopup(false);
    }

    togglePopup(open, persistClose = true) {
      if (open) {
        if (this.stickyPopupEnabled) this.toggleStickyPopup(false);
        this.loadDeferredContent();
        if (this.overlay) {
          this.overlay.classList.add("animate-in");
          this.overlay.classList.remove("animate-out");
        }
        this.bodyEl.classList.add("is-newsletter-popup-show");
        this.setAttribute("open", "");
        this.classList.remove("is-closing");
        this.isOpen = true;
        const email = this.querySelector('input[type="email"]');
        if (email) setTimeout(() => email.focus(), 320);
        return;
      }

      this.classList.add("is-closing");
      if (this.overlay) {
        this.overlay.classList.add("animate-out");
        this.overlay.classList.remove("animate-in");
      }
      setTimeout(() => {
        this.classList.remove("is-closing");
        this.removeAttribute("open");
        this.bodyEl.classList.remove("is-newsletter-popup-show");
        this.isOpen = false;
        if (persistClose) this.setPopupStatus();
        if (this.stickyPopupEnabled && !this.getStickyDismissed()) {
          this.toggleStickyPopup(true);
        }
      }, 350);
    }

    loadDeferredContent() {
      if (this.contentLoaded || !this.contentTemplate || !this.contentContainer) return;
      try {
        const clone = this.contentTemplate.content.cloneNode(true);
        this.contentContainer.innerHTML = "";
        this.contentContainer.appendChild(clone);
        this.contentLoaded = true;
      } catch (err) {
        console.error("Newsletter popup content error:", err);
      }
    }

    toggleStickyPopup(show) {
      if (!this.triggerBtn) return;
      this.triggerBtn.classList.toggle("is-visible", !!show);
    }

    setPopupStatus() {
      this.setStorage(this.storageKey, "true");
    }

    getPopupStatus() {
      if (window.Shopify && Shopify.designMode) return false;
      const value = this.getStorage(this.storageKey);
      if (this.delayTime === "days") return value !== null;
      return value === "true";
    }

    setStickyDismissed(dismissed) {
      if (dismissed) this.setStorage(this.stickyKey, "true");
      else this.removeStorage(this.stickyKey);
    }

    getStickyDismissed() {
      if (window.Shopify && Shopify.designMode) return false;
      const value = this.getStorage(this.stickyKey);
      if (this.delayTime === "days") return value !== null;
      return value === "true";
    }

    setStorage(key, value) {
      try {
        switch (this.delayTime) {
          case "cookies":
            document.cookie = key + "=" + value + "; path=/";
            break;
          case "days": {
            const expires = Date.now() + this.delayDays * 24 * 60 * 60 * 1000;
            localStorage.setItem(key, String(expires));
            break;
          }
          case "session":
          default:
            sessionStorage.setItem(key, String(value));
            break;
        }
      } catch (_) {}
    }

    getStorage(key) {
      try {
        switch (this.delayTime) {
          case "cookies": {
            const match = document.cookie.match(new RegExp("(^| )" + key + "=([^;]+)"));
            return match ? match[2] : null;
          }
          case "days": {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            if (parseInt(raw, 10) <= Date.now()) {
              localStorage.removeItem(key);
              return null;
            }
            return raw;
          }
          case "session":
          default:
            return sessionStorage.getItem(key);
        }
      } catch (_) {
        return null;
      }
    }

    removeStorage(key) {
      try {
        switch (this.delayTime) {
          case "cookies":
            document.cookie = key + "=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            break;
          case "days":
            localStorage.removeItem(key);
            break;
          default:
            sessionStorage.removeItem(key);
            break;
        }
      } catch (_) {}
    }

    disconnectedCallback() {
      if (this.delayTimeoutId) clearTimeout(this.delayTimeoutId);
      window.removeEventListener("scroll", this.onScroll);
    }
  }

  customElements.define("sht-newsletter-popup", SHTNewsletterPopup);
})();
