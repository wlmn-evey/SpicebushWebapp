/**
 * Responsive Image Focal Point Positioning
 * Updates object-position based on screen size to ensure focal points are visible
 */

(function() {
  'use strict';

  // Debounce function to limit resize events
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Update image positions based on screen size
  function updateImagePositions() {
    const images = document.querySelectorAll('.optimized-image-element');
    const screenWidth = window.innerWidth;

    images.forEach(img => {
      let position;
      
      if (screenWidth <= 767) {
        // Mobile
        position = img.dataset.positionMobile;
      } else if (screenWidth <= 1023) {
        // Tablet
        position = img.dataset.positionTablet;
      } else {
        // Desktop
        position = img.dataset.positionDesktop;
      }

      if (position) {
        img.style.objectPosition = position;
      }
    });
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateImagePositions);
  } else {
    updateImagePositions();
  }

  // Update on resize with debounce
  window.addEventListener('resize', debounce(updateImagePositions, 150));

  // Update when new images are loaded dynamically
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1 && node.classList && node.classList.contains('optimized-image')) {
            updateImagePositions();
          }
        });
      }
    });
  });

  // Start observing the document for changes
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();