// Product Hotspots - Make hotspot buttons link to product page
(function() {
  function initHotspotLinks() {
    document.querySelectorAll('.js-hotspot-link').forEach(function(button) {
      if (button.dataset.hotspotLinkInit === '1') return;
      button.dataset.hotspotLinkInit = '1';
      
      const productUrl = button.getAttribute('data-product-url');
      if (!productUrl) return;
      
      // Add click handler to navigate to product page
      button.addEventListener('click', function(e) {
        // Allow carousel trigger to work first (for tooltip/carousel sync)
        // But also navigate to product page
        setTimeout(function() {
          if (productUrl) {
            window.location.href = productUrl;
          }
        }, 100);
      });
    });
  }
  
  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHotspotLinks);
  } else {
    initHotspotLinks();
  }
  
  // Run when sections are loaded
  document.addEventListener('shopify:section:load', initHotspotLinks);
})();
