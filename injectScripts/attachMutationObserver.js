let isStable = false;
let hasMutations = false;
let timeout; // Timeout for stability check

// Callback function to execute when mutations are observed
const callback = (mutationList, observer) => {
  hasMutations = true;  // Mark that a mutation occurred
  clearTimeout(timeout); // Reset the timeout when a mutation occurs

  for (const mutation of mutationList) {
    if (mutation.type === "childList" && isStable) {
      console.log("A child node has been added or removed.");
      console.log(mutation);
    }
  }

  // Set a new timeout to check for DOM stability after 1 second of no changes
  timeout = setTimeout(() => {
    isStable = true;       // Mark the DOM as stable
    console.log("DOM stabilized after mutations.");
  }, 1000);
};

// Create an observer instance linked to the callback function
const observer = new MutationObserver(callback);

// Options for the observer (which mutations to observe)
const config = { attributes: true, childList: true, subtree: true };

// Function to start observing once the DOM is fully loaded
const startObserving = () => {
  // Select the node that will be observed for mutations
  const targetNode = document.documentElement; // Or use document.body

  // Start observing the target node for configured mutations
  observer.observe(targetNode, config);

  console.log("MutationObserver is now observing the entire document.");

  // Set an initial timeout to check if there are no mutations after DOMContentLoaded
  timeout = setTimeout(() => {
    if (!hasMutations) {
      observer.disconnect(); // Stop observing if no mutations are detected
      isStable = true;       // Mark the DOM as stable
      console.log("No mutations detected after DOMContentLoaded, setting DOM as stable.");
    }
  }, 1000);
};

// Check if document is already loaded or wait for DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded fired, starting observation.");
    startObserving();
  });
} else {
  // Document already loaded, start immediately
  console.log("Document already loaded, starting observation.");
  startObserving();
}

// Chrome extension message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CHECK_MutationObserver_JS") {
    sendResponse({ status: isStable ? "DOM_STABLE" : "MUTATIONOBSERVER_READY" });
  }
});
