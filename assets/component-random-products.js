/* Random Products Carousel - Synced Randomization */
(function() {
  function mulberry32(seed) {
    return function() {
      let t = (seed += 0x6D2B79F5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function getSeed(mode) {
    const now = new Date();
    const dayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    const key = mode === 'daily' ? `rp_seed_${dayKey}` : 'rp_seed_visit';
    
    let v = localStorage.getItem(key);
    if (!v) {
      v = String(Math.floor(Math.random() * 2147483647));
      localStorage.setItem(key, v);
    }
    return parseInt(v, 10) || 123456;
  }

  function shuffle(arr, rnd) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function run() {
    document.querySelectorAll('[data-rp-carousel="true"]').forEach((root) => {
      const count = parseInt(root.getAttribute('data-rp-count') || '6', 10);
      const mode = root.getAttribute('data-rp-seed-mode') || 'daily';
      const seed = getSeed(mode);
      const rnd = mulberry32(seed);

      const items = Array.from(root.querySelectorAll('[data-rp-item]'));
      if (items.length <= count) return;

      const indices = shuffle(items.map((_, i) => i), rnd).slice(0, count);
      const keep = new Set(indices);

      items.forEach((el, i) => {
        if (keep.has(i)) {
          el.style.display = '';
          el.style.opacity = '1';
        } else {
          el.style.display = 'none';
          el.style.opacity = '0';
        }
      });

      // Update carousel if it exists (for FUJI carousel functionality)
      const carousel = root.querySelector('.js-carousel-items');
      if (carousel && typeof window.SHTHelper !== 'undefined') {
        // Trigger carousel update if needed
        setTimeout(() => {
          const event = new Event('resize');
          window.dispatchEvent(event);
        }, 100);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
