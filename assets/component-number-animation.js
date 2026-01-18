// Number Animation - Count-up animation for numbers
// שימוש: הוסף class="js-number-animate" לאלמנט עם המספר
// אפשר להוסיף data-target="100000" או שהקוד יקח את המספר מהטקסט
(function() {
  function animateNumber(element, target, duration = 2000) {
    const start = 0;
    const startTime = performance.now();
    const isDecimal = target.toString().includes('.') || target.toString().includes(',');
    
    // שמור את הפורמט המקורי (פסיקים, נקודות, + וכו')
    const originalText = element.textContent.trim();
    const hasPlus = originalText.includes('+');
    const hasComma = originalText.includes(',');
    const hasDecimal = originalText.includes('.');
    
    function formatNumber(num) {
      let formatted = num.toFixed(isDecimal ? 2 : 0);
      
      // החלף נקודה בפסיק אם היה פסיק במקור
      if (hasComma && !hasDecimal) {
        formatted = formatted.replace('.', ',');
      }
      
      // הוסף פסיקים לאלפים
      if (formatted.length > 3) {
        const parts = formatted.split(hasComma && !hasDecimal ? ',' : '.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        formatted = parts.join(hasComma && !hasDecimal ? ',' : '.');
      }
      
      // הוסף + אם היה במקור
      if (hasPlus) {
        formatted += '+';
      }
      
      return formatted;
    }
    
    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = start + (target - start) * easeOut;
      
      element.textContent = formatNumber(current);
      
      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        // וודא שהמספר הסופי מדויק
        element.textContent = formatNumber(target);
      }
    }
    
    requestAnimationFrame(update);
  }
  
  function initNumberAnimations() {
    document.querySelectorAll('.js-number-animate').forEach(function(element) {
      if (element.dataset.animated === 'true') return;
      element.dataset.animated = 'true';
      
      // קח את המספר מה-data-target או מהטקסט
      let targetNumber = parseFloat(element.dataset.target);
      
      if (!targetNumber || isNaN(targetNumber)) {
        // נסה לחלץ מהטקסט
        const text = element.textContent.trim();
        const numberMatch = text.replace(/[^\d,.-]/g, '').replace(',', '.');
        targetNumber = parseFloat(numberMatch);
      }
      
      if (!targetNumber || isNaN(targetNumber)) {
        console.warn('Number animation: Could not parse number from element', element);
        return;
      }
      
      // אפס את המספר
      element.textContent = '0';
      
      // צפה ב-Intersection Observer כדי להתחיל כשהאלמנט נראה
      const observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            const duration = parseInt(element.dataset.duration) || 2000;
            animateNumber(element, targetNumber, duration);
            observer.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.5 // התחל כשחצי מהאלמנט נראה
      });
      
      observer.observe(element);
    });
  }
  
  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNumberAnimations);
  } else {
    initNumberAnimations();
  }
  
  // Run when sections are loaded
  document.addEventListener('shopify:section:load', initNumberAnimations);
})();
