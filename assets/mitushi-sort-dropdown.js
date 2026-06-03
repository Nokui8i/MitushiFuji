(function () {
  var OPEN_CLASS = 'is-open';
  var READY_CLASS = 'is-ready';

  function MitushiSortDropdown(root) {
    this.root = root;
    this._initialized = false;
    this.select = root.querySelector('.mitushi-sort-dropdown__native');
    this.trigger = root.querySelector('.mitushi-sort-dropdown__trigger');
    this.panel = root.querySelector('.mitushi-sort-dropdown__panel');
    this.valueEl = root.querySelector('.mitushi-sort-dropdown__value');
    this.options = root.querySelectorAll('.mitushi-sort-dropdown__option');

    if (!this.select || !this.trigger || !this.panel) {
      return;
    }

    this.onTriggerClick = this.onTriggerClick.bind(this);
    this.onOptionClick = this.onOptionClick.bind(this);
    this.onDocumentClick = this.onDocumentClick.bind(this);
    this.onKeydown = this.onKeydown.bind(this);
    this.onSelectChange = this.onSelectChange.bind(this);

    this.trigger.addEventListener('click', this.onTriggerClick);
    this.options.forEach(
      function (btn) {
        btn.addEventListener('click', this.onOptionClick);
      }.bind(this)
    );
    this.select.addEventListener('change', this.onSelectChange);
    document.addEventListener('click', this.onDocumentClick);
    this.root.addEventListener('keydown', this.onKeydown);

    this._initialized = true;
    this.root.classList.add(READY_CLASS);
    this.syncFromSelect();
  }

  MitushiSortDropdown.prototype.fireSortFilterInput = function () {
    var hidden = document.querySelector(
      this.select.classList.contains('js-collection-product-sort-by-field-select')
        ? '.js-collection-product-sort-by-field-hidden'
        : '.js-main-search-sort-by-field-hidden'
    );
    if (hidden) {
      hidden.value = this.select.value;
      hidden.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  MitushiSortDropdown.prototype.onSelectChange = function () {
    this.syncFromSelect();
  };

  MitushiSortDropdown.prototype.syncFromSelect = function () {
    var value = this.select.value;
    var label = '';

    this.options.forEach(function (btn) {
      var isActive = btn.dataset.value === value;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      if (isActive) {
        label = btn.querySelector('.mitushi-sort-dropdown__option-label').textContent.trim();
      }
    });

    if (this.valueEl && label) {
      this.valueEl.textContent = label;
    }
  };

  MitushiSortDropdown.prototype.open = function () {
    document.querySelectorAll('[data-mitushi-sort-dropdown].' + OPEN_CLASS).forEach(
      function (el) {
        if (el !== this.root) {
          var inst = el._mitushiSortDropdown;
          if (inst && inst._initialized) inst.close();
        }
      }.bind(this)
    );

    this.root.classList.add(OPEN_CLASS);
    this.trigger.setAttribute('aria-expanded', 'true');
    this.panel.setAttribute('aria-hidden', 'false');
    var active = this.root.querySelector('.mitushi-sort-dropdown__option.is-active');
    if (active) active.focus();
  };

  MitushiSortDropdown.prototype.close = function () {
    this.root.classList.remove(OPEN_CLASS);
    this.trigger.setAttribute('aria-expanded', 'false');
    this.panel.setAttribute('aria-hidden', 'true');
  };

  MitushiSortDropdown.prototype.toggle = function () {
    if (this.root.classList.contains(OPEN_CLASS)) {
      this.close();
    } else {
      this.open();
    }
  };

  MitushiSortDropdown.prototype.onTriggerClick = function (event) {
    event.preventDefault();
    event.stopPropagation();
    this.toggle();
  };

  MitushiSortDropdown.prototype.onOptionClick = function (event) {
    var btn = event.currentTarget;
    var value = btn.dataset.value;
    if (!value || this.select.value === value) {
      this.close();
      this.trigger.focus();
      return;
    }

    this.select.value = value;
    this.select.dispatchEvent(new Event('change', { bubbles: true }));
    this.fireSortFilterInput();
    this.syncFromSelect();
    this.close();
    this.trigger.focus();
  };

  MitushiSortDropdown.prototype.onDocumentClick = function (event) {
    if (!this._initialized || !this.root.classList.contains(OPEN_CLASS)) return;
    if (!this.root.contains(event.target)) this.close();
  };

  MitushiSortDropdown.prototype.onKeydown = function (event) {
    if (!this._initialized) return;

    if (!this.root.classList.contains(OPEN_CLASS)) {
      if (event.target === this.trigger && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        this.open();
      }
      return;
    }

    var items = Array.prototype.slice.call(this.options);
    var index = items.indexOf(document.activeElement);

    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      this.trigger.focus();
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (index === -1) index = 0;
      else index += event.key === 'ArrowDown' ? 1 : -1;
      if (index < 0) index = items.length - 1;
      if (index >= items.length) index = 0;
      items[index].focus();
    }
  };

  MitushiSortDropdown.prototype.destroy = function () {
    if (!this._initialized) {
      delete this.root._mitushiSortDropdown;
      return;
    }

    this.trigger.removeEventListener('click', this.onTriggerClick);
    this.select.removeEventListener('change', this.onSelectChange);
    document.removeEventListener('click', this.onDocumentClick);
    this.options.forEach(
      function (btn) {
        btn.removeEventListener('click', this.onOptionClick);
      }.bind(this)
    );

    this.close();
    this.root.classList.remove(READY_CLASS, OPEN_CLASS);
    this._initialized = false;
    delete this.root._mitushiSortDropdown;
  };

  function initSortDropdowns() {
    document.querySelectorAll('[data-mitushi-sort-dropdown]').forEach(function (root) {
      if (root._mitushiSortDropdown && root._mitushiSortDropdown._initialized) {
        root._mitushiSortDropdown.destroy();
      }
      root._mitushiSortDropdown = new MitushiSortDropdown(root);
    });

    syncMobileDesktopSelects();
  }

  function syncMobileDesktopSelects() {
    var isSearch = document.body.classList.contains('template-search');
    var desktop = document.querySelector(
      isSearch
        ? 'sht-srch .mitushi-sort-dropdown__native#SortByField'
        : '.main-collection-product .mitushi-sort-dropdown__native#SortByField'
    );
    var mobile = document.getElementById('SortByFieldToolbar');
    if (!desktop || !mobile || desktop === mobile) return;
    if (mobile.dataset.mitushiSynced === 'true') return;
    mobile.dataset.mitushiSynced = 'true';

    mobile.addEventListener('change', function () {
      if (desktop.value === mobile.value) return;
      desktop.value = mobile.value;
      desktop.dispatchEvent(new Event('change', { bubbles: true }));
      var hidden = document.querySelector('.js-collection-product-sort-by-field-hidden');
      if (hidden) {
        hidden.value = desktop.value;
        hidden.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  }

  var reinitTimer;

  function scheduleReinit() {
    clearTimeout(reinitTimer);
    reinitTimer = setTimeout(initSortDropdowns, 60);
  }

  function watchSortMarkupRefresh() {
    document.querySelectorAll('.js-filter-form-sorting').forEach(function (node) {
      if (node.dataset.mitushiSortWatch === 'true') return;
      node.dataset.mitushiSortWatch = 'true';
      new MutationObserver(scheduleReinit).observe(node, {
        childList: true,
        subtree: true,
      });
    });
  }

  function boot() {
    initSortDropdowns();
    watchSortMarkupRefresh();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  document.addEventListener('shopify:section:load', boot);
})();
