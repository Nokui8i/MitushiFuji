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
      
      // מצא את החלק הפנימי השחור (hotspot-inner-clickable)
      const innerClickable = button.querySelector('.hotspot-inner-clickable');
      
      // Add click handler - רק אם לחיצה על החלק השחור או על הכפתור עצמו (אם אין חלק שחור)
      (innerClickable || button).addEventListener('click', function(e) {
        // אם יש חלק פנימי, וודא שהלחיצה עליו
        if (innerClickable && e.target !== innerClickable && !innerClickable.contains(e.target)) {
          // לחיצה על החלק הלבן - התעלם
          return;
        }
        
        // עכשיו מטפלים בלחיצה על החלק השחור או על הכפתור
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
          // לחיצה ראשונה - מציגה פרטים (tooltip), לא מעבירה ולא מפעילה carousel
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          
          // סגור כל ה-tooltips (גם של FUJI theme וגם שלנו) לפני הצגת אחד חדש
          const currentTooltip = button.querySelector('.js-tooltip-content');
          
          // סגור כל ה-tooltips של FUJI theme
          document.querySelectorAll('.js-tooltip-placeholder').forEach(function(placeholder) {
            if (placeholder !== button) {
              const tooltip = placeholder.querySelector('.js-tooltip-content');
              if (tooltip) {
                tooltip.classList.remove('opacity-1', 'show', 'd-block');
                tooltip.classList.add('opacity-0');
                tooltip.style.display = 'none';
                tooltip.style.visibility = 'hidden';
                tooltip.style.opacity = '0';
              }
            }
          });
          
          // סגור כל ה-tooltips האחרים שלנו
          document.querySelectorAll('.js-tooltip-content').forEach(function(otherTooltip) {
            if (otherTooltip !== currentTooltip) {
              otherTooltip.classList.remove('opacity-1', 'show', 'd-block');
              otherTooltip.classList.add('opacity-0');
              otherTooltip.style.display = 'none';
              otherTooltip.style.visibility = 'hidden';
              otherTooltip.style.opacity = '0';
              otherTooltip.dataset.isShowing = '';
            }
          });
          
          // מונע את ה-tooltip של FUJI theme מלהציג - הסר את ה-class זמנית
          const wasTooltipPlaceholder = button.classList.contains('js-tooltip-placeholder');
          if (wasTooltipPlaceholder) {
            button.classList.remove('js-tooltip-placeholder');
          }
          
          // מונע הפעלת carousel בצד - מוצא את ה-carousel trigger ומבטל אותו
          const carouselTrigger = button.closest('sht-carousel-trig');
          if (carouselTrigger) {
            const carouselId = carouselTrigger.getAttribute('data-carousel-target');
            if (carouselId) {
              const carousel = document.getElementById(carouselId);
              if (carousel) {
                // מונע שינוי ב-carousel - שומר את המצב הנוכחי
                carousel.dataset.hotspotBlocked = 'true';
              }
            }
          }
          
          // מציג את ה-tooltip במובייל
          const tooltip = currentTooltip;
          if (tooltip && !tooltip.dataset.isShowing) {
            tooltip.dataset.isShowing = 'true';
            
            // הסר כל המחלקות שמסתירות
            tooltip.classList.remove('hidden-xs', 'opacity-0', 'd-none');
            tooltip.classList.add('opacity-1', 'show', 'd-block');
            
            // Set inline styles to force visibility
            tooltip.style.setProperty('display', 'block', 'important');
            tooltip.style.setProperty('opacity', '1', 'important');
            tooltip.style.setProperty('visibility', 'visible', 'important');
            tooltip.style.setProperty('position', 'absolute', 'important');
            tooltip.style.setProperty('z-index', '999', 'important');
            tooltip.style.setProperty('pointer-events', 'none', 'important');
            
            // Position tooltip near the button (above it)
            const rect = button.getBoundingClientRect();
            const tooltipHeight = tooltip.offsetHeight || 80;
            tooltip.style.setProperty('left', '50%', 'important');
            tooltip.style.setProperty('top', (rect.top - tooltipHeight - 10) + 'px', 'important');
            tooltip.style.setProperty('transform', 'translateX(-50%)', 'important');
            
            // החזר את ה-class של FUJI theme אחרי שהצגנו את ה-tooltip שלנו
            if (wasTooltipPlaceholder) {
              setTimeout(function() {
                button.classList.add('js-tooltip-placeholder');
              }, 50);
            }
            
            // הסתר tooltip אחרי 3 שניות
            setTimeout(function() {
              tooltip.classList.remove('opacity-1', 'show', 'd-block');
              tooltip.classList.add('opacity-0');
              tooltip.style.opacity = '0';
              setTimeout(function() {
                tooltip.style.display = 'none';
                tooltip.style.visibility = 'hidden';
                tooltip.dataset.isShowing = '';
                // הסר את החסימה אחרי שהכל נסגר
                if (carouselTrigger) {
                  const carouselId = carouselTrigger.getAttribute('data-carousel-target');
                  if (carouselId) {
                    const carousel = document.getElementById(carouselId);
                    if (carousel) {
                      delete carousel.dataset.hotspotBlocked;
                    }
                  }
                }
              }, 300);
            }, 3000);
          }
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
      }, true); // useCapture = true כדי לעצור לפני handlers אחרים
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
