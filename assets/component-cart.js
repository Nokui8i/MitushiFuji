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
    this.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const form = this.closest("sht-cart-frm");
      if (form?.removeCartLine) {
        form.removeCartLine(this.dataset.index);
      }
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
    this._changeBusy = false;
    this._changeQueued = null;
    this.bindEventHandlers();
  }

  bindEventHandlers() {
    this.addEventListener("change", (e) => this.onChange(e));
    this.addEventListener("click", (e) => {
      const removeBtn = e.target.closest("[data-cart-remove]");
      if (!removeBtn) return;
      e.preventDefault();
      const lineIndex = removeBtn.closest("sht-cart-rmv-btn")?.dataset?.index;
      if (lineIndex) this.removeCartLine(lineIndex);
    });
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

  getLineInventoryMax(lineIndex) {
    const row = document.getElementById("cartItem-" + lineIndex);
    if (!row) return null;
    const raw = row.dataset.inventoryMax || row.querySelector(".js-quantity-input")?.getAttribute("max");
    const max = parseInt(raw, 10);
    return !isNaN(max) && max > 0 ? max : null;
  }

  formatStockMessage(template, count) {
    if (!template) return "Only " + count + " in stock.";
    return template.replace("[count]", String(count)).replace("{{ count }}", String(count));
  }

  normalizeStockError(message, lineIndex) {
    if (!message) return SHTLanguage.cart.ERROR;
    const max = this.getLineInventoryMax(lineIndex);
    const match = String(message).match(/(\d+)/);
    const count = max !== null ? max : match ? parseInt(match[1], 10) : null;
    if (count !== null && /only|maximum|available|added|quantity/i.test(message)) {
      return this.formatStockMessage(SHTLanguage.cart.INVENTORY_LIMIT_UPDATE, count);
    }
    return message;
  }

  clampLineQuantity(lineIndex, quantity) {
    const row = document.getElementById("cartItem-" + lineIndex);
    const input = row?.querySelector(".js-quantity-input");
    let qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 0) return { qty: 0, clamped: false };

    const max = this.getLineInventoryMax(lineIndex);
    if (max !== null && qty > max) {
      qty = max;
      if (input) input.value = max;
      return { qty, clamped: true, max };
    }

    return { qty, clamped: false, max };
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

  estimateCartItemCount() {
    let total = 0;
    this.querySelectorAll(".cart-item .js-quantity-input").forEach((input) => {
      total += parseInt(input.value, 10) || 0;
    });
    return total;
  }

  syncCartCountBadges(itemCount, options = {}) {
    if (typeof itemCount !== "number") return;
    if (window.MitushiCartFeedback?.setCount) {
      window.MitushiCartFeedback.setCount(itemCount, options);
      return;
    }
    document.querySelectorAll(".mitushi-cart-badge, .js-cart-form-item_count, .cart-count-number").forEach((el) => {
      el.textContent = itemCount;
      if (el.classList?.contains("mitushi-cart-badge")) {
        el.classList.toggle("is-empty", itemCount === 0);
      }
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

  setLineRemovingState(lineIndex, isRemoving) {
    const row = document.getElementById("cartItem-" + lineIndex);
    const btn = row?.querySelector("[data-cart-remove]");
    if (row) row.classList.toggle("is-removing", isRemoving);
    if (btn) {
      btn.classList.toggle("is-removing", isRemoving);
      btn.disabled = isRemoving;
    }
  }

  cancelPendingUpdates() {
    clearTimeout(this._sendTimer);
    this._pending = null;
  }

  async removeCartLine(lineIndex) {
    const line = parseInt(lineIndex, 10);
    if (!line) return;

    const row = document.getElementById("cartItem-" + line);
    if (row?.classList.contains("is-removing")) return;

    this.cancelPendingUpdates();
    this._changeQueued = { lineIndex: line, quantity: 0, buttonName: null };

    if (this._changeBusy) return;

    await this.flushCartChangeQueue();
  }

  async flushCartChangeQueue() {
    if (this._changeBusy || !this._changeQueued) return;

    const { lineIndex, quantity, buttonName } = this._changeQueued;
    this._changeQueued = null;

    if (quantity === 0) {
      this.setLineRemovingState(lineIndex, true);
    }

    await this.sendQuantityUpdate(lineIndex, quantity, buttonName);
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

    this.syncCartCountBadges(this.estimateCartItemCount(), { animate: true });
  }

  cartJsUrl() {
    const root = window.Shopify?.routes?.root || "/";
    return (root.endsWith("/") ? root : root + "/") + "cart.js";
  }

  async fetchCartState() {
    if (this._cartSyncPromise) return this._cartSyncPromise;

    this._cartSyncPromise = (async () => {
      const res = await fetch(this.cartJsUrl(), { credentials: "same-origin" });
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
    const errorEl = this.$(".js-cart-form-errors");
    const { qty, clamped, max } = this.clampLineQuantity(lineIndex, quantity);

    if (!line || isNaN(qty) || qty < 0) return;

    if (clamped && errorEl && max !== null) {
      errorEl.textContent = this.formatStockMessage(SHTLanguage.cart.INVENTORY_LIMIT_UPDATE, max);
    } else if (errorEl && !clamped) {
      errorEl.textContent = "";
    }

    this._pending = { line, qty, buttonName };
    clearTimeout(this._sendTimer);

    if (qty === 0) {
      this._changeQueued = { lineIndex: line, quantity: 0, buttonName };
      this.flushCartChangeQueue();
      return;
    }

    if (qty > 0) {
      const row = document.getElementById("cartItem-" + lineIndex);
      const input = row?.querySelector(".js-quantity-input");
      if (input) input.value = qty;
      this.applyOptimisticUI(lineIndex, qty);
    }

    const delay = options.immediate ? 280 : 500;
    this._sendTimer = setTimeout(() => {
      if (!this._pending) return;
      const payload = this._pending;
      this._pending = null;
      this.enqueueQuantitySend(payload.line, payload.qty, payload.buttonName);
    }, delay);
  }

  enqueueQuantitySend(lineIndex, quantity, buttonName) {
    this._changeQueued = { lineIndex, quantity, buttonName };
    this.flushCartChangeQueue();
  }

  sendQuantityUpdate(lineIndex, quantity, buttonName) {
    const requestGen = ++this._requestGen;
    const errorEl = this.$(".js-cart-form-errors");
    const isRemove = quantity === 0;
    this._changeBusy = true;

    const body = JSON.stringify({
      line: lineIndex,
      quantity: quantity,
    });

    const changeUrl = window.routes.cart_change_js_url || (window.routes.cart_change_url + ".js");
    const fetchOpts = {
      ...SHTHelper.fetchConfigJSON,
      body,
      credentials: "same-origin",
    };
    if (quantity === 0) fetchOpts.keepalive = true;

    return fetch("" + changeUrl, fetchOpts)
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
          try {
            await this.applyCartState(await this.fetchCartState());
          } catch (e) {
            /* skip */
          }
          return;
        }

        if (!res.ok) {
          const raw =
            data?.description || data?.message || (typeof data?.errors === "string" ? data.errors : null);
          const message = this.normalizeStockError(raw, lineIndex);
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

        if (data?.items || typeof data?.item_count === "number") {
          await this.applyCartState(data);
        } else {
          try {
            await this.applyCartState(await this.fetchCartState());
          } catch (e) {
            /* skip */
          }
        }

        const lineItem = SHTHelper.qid("cartItem-" + lineIndex);
        const focusBtn = lineItem?.querySelector(".js-quantity-btn-" + buttonName);
        if (focusBtn) focusBtn.focus();

        if (this.cartDrawerForm?.renderContents && data) {
          try {
            this.cartDrawerForm.renderContents(data);
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
      })
      .finally(() => {
        if (isRemove) this.setLineRemovingState(lineIndex, false);
        this._changeBusy = false;
        this.flushCartChangeQueue();
      });
  }
}
customElements.define("sht-cart-frm", SHTCartForm);
