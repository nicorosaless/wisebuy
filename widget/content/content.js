function checkAndLogBody() {
  const url = window.location.href.toLowerCase();
  if (url.includes("/cart") || url.includes("/checkout")) { // Cambiado para que solo registre en la página de checkout
    setTimeout(() => {
      console.log("HTML Body Content:", document.body.innerHTML);
      alert("HTML content has been logged to the console.");
    }, 1000); // Delay to allow dynamic content to load
  }
}

// Override history methods to detect SPA navigation
(function(history){
  const push = history.pushState;
  history.pushState = function() {
    const ret = push.apply(this, arguments);
    checkAndLogBody();
    return ret;
  };
  const replace = history.replaceState;
  history.replaceState = function() {
    const ret = replace.apply(this, arguments);
    checkAndLogBody();
    return ret;
  };
})(window.history);

// Listen for back/forward navigation
window.addEventListener("popstate", checkAndLogBody);

// Fire once when DOM is ready
// if (document.readyState === "complete" || document.readyState === "interactive") {
//   checkAndLogBody();
// } else {
//   document.addEventListener("DOMContentLoaded", checkAndLogBody);
// }

// Function to observe URL changes dynamically
function observeUrlChanges() {
  let lastUrl = window.location.href;
  const observer = new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      checkAndLogBody();
    }
  });

  observer.observe(document, { subtree: true, childList: true });
}

// Call observeUrlChanges to monitor URL changes
observeUrlChanges();