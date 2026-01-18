// Product Hotspots - Make hotspot buttons link to product page
// במובייל: לחיצה ראשונה מציגה פרטים, לחיצה שנייה מעבירה לעמוד
(function() {
  function isMobile() {
    return window.innerWidth <= 749;
  }
  
  function initHotspotLinks() {
    document.querySelectorAll('.js-hotspot-link').forEach(function(button) {
      if (button.dataset.hotspotLinkInit === '1') return;
      button.dataset.hotspotLinkInit = '1';
      
      const productUrl = button.getAttribute('data-product-url');
      if (!productUrl) return;
      
      let clickCount = 0;
      let clickTimer = null;
      
      // Add click handler
      button.addEventListener('click', function(e) {
        // בדסקטופ - מעביר ישר לעמוד המוצר
        if (!isMobile()) {
          e.preventDefault();
          e.stopPropagation();
          setTimeout(function() {
            if (productUrl) {
              window.location.href = productUrl;
            }
          }, 100);
          return;
        }
        
        // במובייל - לחיצה ראשונה מציגה פרטים, שנייה מעבירה
        clickCount++;
        
        // איפוס מונה אחרי 2 שניות
        clearTimeout(clickTimer);
        clickTimer = setTimeout(function() {
          clickCount = 0;
        }, 2000);
        
        if (clickCount === 1) {
          // לחיצה ראשונה - רק מציגה פרטים (tooltip), לא מעבירה
          // ה-carousel trigger יעשה את זה
          e.stopPropagation();
        } else if (clickCount === 2) {
          // לחיצה שנייה - מעבירה לעמוד המוצר
          e.preventDefault();
          e.stopPropagation();
          clickCount = 0;
          setTimeout(function() {
            if (productUrl) {
              window.location.href = productUrl;
            }
          }, 100);
        }
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
  
  // Re-init on resize (in case switching between mobile/desktop)
  window.addEventListener('resize', function() {
    // Only re-init if switching between mobile/desktop
    const wasMobile = document.body.dataset.wasMobile === 'true';
    const nowMobile = isMobile();
    if (wasMobile !== nowMobile) {
      document.querySelectorAll('.js-hotspot-link').forEach(function(button) {
        button.dataset.hotspotLinkInit = '0';
      });
      initHotspotLinks();
    }
    document.body.dataset.wasMobile = String(nowMobile);
  });
})();
