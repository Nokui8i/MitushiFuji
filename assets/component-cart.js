class SHTCartNote extends SHTCustomComponent {
  constructor() {
    super();
    this.bindEventHandlers();
  }
  bindEventHandlers() {
    this.addEventListener(
      "change",
      SHTHelper.debounce((t) => {
        t = JSON.stringify({ note: t.target.value });
        fetch("" + window.routes.cart_update_url, { ...SHTHelper.fetchConfigJSON, body: t });
      }, 300)
    );
  }
}
customElements.define("sht-cart-note", SHTCartNote);

class SHTCartRemoveButton extends SHTCustomComponent {
  constructor() {
    super();
    this.addEventListener("click", (t) => {
      t.preventDefault();
      const form = this.closest("sht-cart-frm");
      const row = this.closest(".cart-item");
      form.removeLineOptimistic(this.dataset.index, row);
      form.queueQuantityUpdate(this.dataset.index, 0, null, { immediate: true });
    });
  }
}
customElements.define("sht-cart-rmv-btn", SHTCartRemoveButton);

class SHTCartForm extends SHTCustomComponent {
  constructor() {
    super();
    this.cartDrawer = SHTHelper.qs("sht-cart-drwr");
    this.cartDrawerForm = SHTHelper.qs("sht-cart-drwr-frm");
    this._sendTimer = null;
    this._pending = null;
    this._requestGen = 0;
    this._cartSyncPromise = null;
    this.bindEventHandlers();
  }

  bindEventHandlers() {
    this.addEventListener("change", (e) => this.onChange(e));
  }

  onChange(e) {
    if (e.target.name === "note") return;
    if (!e.target.classList?.contains("js-quantity-input")) return;

    const lineIndex = e.target.dataset.index;
    const qty = e.target.value;
    const buttonName = document.activeElement?.dataset?.name;
    const immediate = buttonName === "plus" || buttonName === "minus";

    this.queueQuantityUpdate(lineIndex, qty, buttonName, { immediate });
  }

  formatMoney(cents) {
    if (typeof SHTHelper?.formatMoney === "function" && window.theme_variables?.settings?.money_format) {
      return SHTHelper.formatMoney(cents, window.theme_variables.settings.money_format);
    }
    if (typeof Shopify !== "undefined" && typeof Shopify.formatMoney === "function") {
      return Shopify.formatMoney(cents);
    }
    return "$" + (cents / 100).toFixed(2);
  }

  estimateCartTotalCents() {
    let total = 0;
    this.querySelectorAll(".cart-item[data-unit-price]").forEach((row) => {
      const unit = parseInt(row.dataset.unitPrice, 10) || 0;
      const qty = parseInt(row.querySelector(".js-quantity-input")?.value, 10) || 0;
      total += unit * qty;
    });
    return total;
  }

  syncCartCountBadges(itemCount) {
    if (typeof itemCount !== "number") return;
    document.querySelectorAll(".mitushi-cart-badge, .js-cart-form-item_count, .cart-count-number").forEach((el) => {
      el.textContent = itemCount;
    });
  }

  toggleCartEmpty(isEmpty) {
    const header = this.querySelector(".js-cart-page-header");
    const empty = this.querySelector(".js-cart-page-empty");
    const form = this.querySelector(".js-cart-page-form");

    if (header) {
      header.classList.toggle("hidden", isEmpty);
      header.classList.toggle("block", !isEmpty);
    }
    if (empty) {
      empty.classList.toggle("hidden", !isEmpty);
      empty.classList.toggle("block", isEmpty);
    }
    if (form) {
      form.classList.toggle("hidden", isEmpty);
      form.classList.toggle("block", !isEmpty);
    }

    this.classList.toggle("cart-content--is-empty", isEmpty);

    const footer = this.querySelector(".js-cart-form-footer");
    if (footer) footer.classList.toggle("d-none", isEmpty);
  }

  clearCartItemsDOM() {
    const itemsWrap = this.querySelector(".js-cart-form-content-cart-items");
    if (itemsWrap) itemsWrap.innerHTML = "";
  }

  renderEmptyCart() {
    this.clearCartItemsDOM();
    this.toggleCartEmpty(true);
    this.syncCartCountBadges(0);

    this.querySelectorAll(".js-cart-total").forEach((el) => {
      el.textContent = this.formatMoney(0);
    });
    const summaryTotal = this.querySelector(".mitushi-cart-summary dl .font-display.text-2xl");
    if (summaryTotal) summaryTotal.textContent = this.formatMoney(0);

    if (window.MitushiCart?.updateProgress) {
      window.MitushiCart.updateProgress(0);
    }
  }

  removeLineOptimistic(lineIndex, rowEl) {
    const row = rowEl || document.getElementById("cartItem-" + lineIndex);
    if (row) row.remove();

    const remaining = this.querySelectorAll(".cart-item").length;
    if (remaining === 0) {
      this.renderEmptyCart();
      return;
    }

    this.applyOptimisticUI(lineIndex, 0);
  }

  async refreshCartItemsSection() {
    const sectionId = this.querySelector(".js-cart-form-wrapper")?.dataset?.sectionId;
    if (!sectionId) return false;

    const root = window.Shopify?.routes?.root || "/";
    const url = root + "?section_id=" + encodeURIComponent(sectionId);
    const res = await fetch(url);
    if (!res.ok) return false;

    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const fresh = doc.querySelector(".js-cart-form-content-cart-items");
    const current = this.querySelector(".js-cart-form-content-cart-items");

    if (fresh && current) {
      current.innerHTML = fresh.innerHTML;
      return true;
    }
    return false;
  }

  applyLineUpdates(cart) {
    (cart.items || []).forEach((item, index) => {
      const line = index + 1;
      const row = document.getElementById("cartItem-" + line);
      if (!row) return;
      const input = row.querySelector(".js-quantity-input");
      const priceEl = row.querySelector(".cart-item__price .font-display");
      if (input) {
        input.value = item.quantity;
        input.dataset.cartQuantity = String(item.quantity);
      }
      if (priceEl) priceEl.textContent = this.formatMoney(item.final_line_price);
    });
  }

  applyOrderTotals(cart) {
    if (typeof cart.total_price !== "number") return;

    const formatted = this.formatMoney(cart.total_price);
    this.querySelectorAll(".js-cart-total").forEach((el) => {
      el.textContent = formatted;
    });
    const summaryTotal = this.querySelector(".mitushi-cart-summary dl .font-display.text-2xl");
    if (summaryTotal) summaryTotal.textContent = formatted;

    const threshold = parseInt(this.querySelector(".mitushi-freeship")?.dataset?.freeshipThreshold, 10) || 19900;
    const shippingRow = this.querySelector(".mitushi-cart-summary dl > div:nth-child(2) dd");
    if (shippingRow) {
      shippingRow.innerHTML =
        cart.total_price >= threshold
          ? '<span class="text-crimson font-bold">FREE</span>'
          : "Calculated at checkout";
    }

    if (window.MitushiCart?.updateProgress) {
      window.MitushiCart.updateProgress(cart.total_price);
    }
  }

  async applyCartState(cart) {
    if (!cart) return;

    if (cart.item_count === 0 || !cart.items || cart.items.length === 0) {
      this.renderEmptyCart();
      return;
    }

    this.toggleCartEmpty(false);

    const domCount = this.querySelectorAll(".cart-item").length;
    if (domCount !== cart.items.length) {
      await this.refreshCartItemsSection();
    }

    this.applyLineUpdates(cart);
    this.applyOrderTotals(cart);
    this.syncCartCountBadges(cart.item_count);
  }

  applyOptimisticUI(lineIndex, quantity) {
    const qty = parseInt(quantity, 10) || 0;
    const row = document.getElementById("cartItem-" + lineIndex);

    if (qty === 0) {
      if (row) row.remove();
      if (this.querySelectorAll(".cart-item").length === 0) {
        this.renderEmptyCart();
        return;
      }
    } else if (row) {
      const unit = parseInt(row.dataset.unitPrice, 10) || 0;
      const priceEl = row.querySelector(".cart-item__price .font-display");
      if (priceEl && unit) priceEl.textContent = this.formatMoney(unit * qty);
    }

    const total = this.estimateCartTotalCents();
    const formatted = this.formatMoney(total);
    this.querySelectorAll(".js-cart-total").forEach((el) => {
      el.textContent = formatted;
    });
    const summaryTotal = this.querySelector(".mitushi-cart-summary dl .font-display.text-2xl");
    if (summaryTotal) summaryTotal.textContent = formatted;

    if (window.MitushiCart?.updateProgress) window.MitushiCart.updateProgress(total);
  }

  async fetchCartState() {
    if (this._cartSyncPromise) return this._cartSyncPromise;

    this._cartSyncPromise = (async () => {
      const root = window.Shopify?.routes?.root || "/";
      const res = await fetch(root + "cart.js");
      if (res.status === 429) {
        throw new Error("rate_limited");
      }
      if (!res.ok) throw new Error("cart.js failed");
      return res.json();
    })().finally(() => {
      this._cartSyncPromise = null;
    });

    return this._cartSyncPromise;
  }

  queueQuantityUpdate(lineIndex, quantity, buttonName, options = {}) {
    const line = parseInt(lineIndex, 10);
    const qty = parseInt(quantity, 10);

    if (!line || isNaN(qty) || qty < 0) return;

    if (qty > 0) {
      this.applyOptimisticUI(lineIndex, qty);
    }

    this._pending = { line, qty, buttonName };
    clearTimeout(this._sendTimer);

    const delay = options.immediate ? 450 : 600;
    this._sendTimer = setTimeout(() => {
      if (!this._pending) return;
      const payload = this._pending;
      this._pending = null;
      this.sendQuantityUpdate(payload.line, payload.qty, payload.buttonName);
    }, delay);
  }

  sendQuantityUpdate(lineIndex, quantity, buttonName) {
    const requestGen = ++this._requestGen;
    const errorEl = this.$(".js-cart-form-errors");

    const body = JSON.stringify({
      line: lineIndex,
      quantity: quantity,
    });

    fetch("" + window.routes.cart_change_url, { ...SHTHelper.fetchConfigJSON, body })
      .then(async (res) => {
        const text = await res.text();
        let data = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch (e) {
          data = null;
        }

        if (requestGen !== this._requestGen) return;

        if (res.status === 429) {
          if (errorEl) {
            errorEl.textContent = "Too many updates — wait a moment and refresh the page.";
          }
          return;
        }

        if (!res.ok) {
          const message =
            data?.description || data?.message || (typeof data?.errors === "string" ? data.errors : null);
          if (errorEl) {
            errorEl.textContent = message || SHTLanguage.cart.ERROR;
          }
          try {
            await this.applyCartState(await this.fetchCartState());
          } catch (e) {
            /* skip extra sync while rate-limited */
          }
          return;
        }

        if (errorEl) errorEl.textContent = "";

        if (data?.errors) {
          if (errorEl) errorEl.textContent = typeof data.errors === "string" ? data.errors : SHTLanguage.cart.ERROR;
          try {
            await this.applyCartState(await this.fetchCartState());
          } catch (e) {
            /* skip */
          }
          return;
        }

        if (data?.items) {
          await this.applyCartState(data);
        }

        const lineItem = SHTHelper.qid("cartItem-" + lineIndex);
        const focusBtn = lineItem?.querySelector(".js-quantity-btn-" + buttonName);
        if (focusBtn) focusBtn.focus();

        if (this.cartDrawerForm?.renderContents) {
          try {
            this.cartDrawerForm.renderContents(cart);
          } catch (err) {
            /* optional */
          }
        }
      })
      .catch(async () => {
        if (requestGen !== this._requestGen) return;
        if (errorEl) errorEl.textContent = SHTLanguage.cart.ERROR;
        try {
          await this.applyCartState(await this.fetchCartState());
        } catch (e) {
          /* ignore */
        }
      });
  }
}
customElements.define("sht-cart-frm", SHTCartForm);
