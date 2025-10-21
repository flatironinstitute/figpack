// Check for embed query parameter and hide sidebar if present
(function() {
    // Check both standard query string and hash-based query string
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    
    if (urlParams.get('embed') === 'true' || hashParams.get('embed') === 'true') {
        document.documentElement.classList.add('embed-mode');
    }
})();
