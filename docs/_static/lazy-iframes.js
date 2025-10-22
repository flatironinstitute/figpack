// Lazy load iframes using Intersection Observer API
(function() {
    'use strict';

    // Check if Intersection Observer is supported
    if (!('IntersectionObserver' in window)) {
        console.warn('IntersectionObserver not supported, iframes will load immediately');
        return;
    }

    // Configuration
    const config = {
        rootMargin: '200px', // Start loading 200px before iframe enters viewport
        threshold: 0
    };

    // Create observer
    const observer = new IntersectionObserver(function(entries, self) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                const iframe = entry.target;
                
                // Load the iframe
                if (iframe.dataset.src) {
                    iframe.src = iframe.dataset.src;
                    
                    // Remove the loading class once loaded
                    iframe.addEventListener('load', function() {
                        iframe.classList.remove('lazy-loading');
                        iframe.classList.add('lazy-loaded');
                    });
                    
                    // Stop observing this iframe
                    self.unobserve(iframe);
                }
            }
        });
    }, config);

    // Function to setup lazy loading
    function setupLazyIframes() {
        // Find all iframes with data-src attribute
        const lazyIframes = document.querySelectorAll('iframe[data-src]');
        
        lazyIframes.forEach(function(iframe) {
            // Add loading class for styling
            iframe.classList.add('lazy-loading');
            
            // Start observing
            observer.observe(iframe);
        });
        
        console.log('Lazy loading enabled for ' + lazyIframes.length + ' iframe(s)');
    }

    // Setup when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupLazyIframes);
    } else {
        setupLazyIframes();
    }
})();
