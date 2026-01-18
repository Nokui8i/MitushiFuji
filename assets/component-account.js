class SHTAccountAddresses {
  constructor() {
    this.toggle_address_btn = SHTHelper.qsa(".js-account-address-toggle-address-btn");
    this.cancel_address_btn = SHTHelper.qsa(".js-account-address-cancel-address-btn");
    this.delete_address_btn = SHTHelper.qsa(".js-account-address-delete-address-btn");
    this.country_select_element = SHTHelper.qsa(".js-account-address-country-select");
    this.setupEventListeners();
    this.setupCountries();
  }

  setupEventListeners() {
    this.toggle_address_btn.forEach(element => {
      element.addEventListener("click", this.handleAddEditButtonClick.bind(this));
    });

    this.cancel_address_btn.forEach(element => {
      element.addEventListener("click", this.handleCancelButtonClick.bind(this));
    });

    this.delete_address_btn.forEach(element => {
      element.addEventListener("click", this.handleDeleteButtonClick.bind(this));
    });
  }

  setupCountries() {
    if (Shopify && Shopify.CountryProvinceSelector) {
      new Shopify.CountryProvinceSelector("addressCountryNew", "addressProvinceNew", {
        hideElement: "addressProvinceContainerNew",
      });
      this.country_select_element.forEach(select => {
        const formId = select.dataset.formId;
        new Shopify.CountryProvinceSelector(`addressCountry_${formId}`, `addressProvince_${formId}`, {
          hideElement: `addressProvinceContainer_${formId}`,
        });
      });
    }
  }

  handleDeleteButtonClick(e) {
    e.preventDefault();

    if (confirm(e.currentTarget.getAttribute("data-confirm-message"))) {
      Shopify.postLink(e.currentTarget.dataset.target, {
        parameters: { _method: "delete" },
      });
    }
  }

  handleCancelButtonClick(e) {
    //e.preventDefault();
    const target = SHTHelper.qs(`#editFormButton_${e.currentTarget.getAttribute("data-address-id")}`);
    target && this.toggleForm(target);
  }

  handleAddEditButtonClick(e) {
    e.preventDefault();
    this.toggleForm(e.currentTarget);
  }

  toggleForm(target) {
    target.setAttribute("aria-expanded", (target.getAttribute("aria-expanded") === "false").toString());
    const form = SHTHelper.qs(`#${target.getAttribute("data-address-id")}`);

    form && form.classList.toggle("d-none");
  }
}

typeof SHTAccountAddresses !== "undefined" && new SHTAccountAddresses();
