// Callback function to execute when mutations are observed
const callback = (mutationList, observer) => {
    for (const mutation of mutationList) {
      if (mutation.type === "childList") {
        console.log("A child node has been added or removed.");
      }
    }
  };
  
  // Create an observer instance linked to the callback function
  const observer = new MutationObserver(callback);
  
  // Options for the observer (which mutations to observe)
  const config = { attributes: true, childList: true, subtree: true };
  
  // Function to start observing once the document is fully loaded
  const startObserving = () => {
    // Select the node that will be observed for mutations
    const targetNode = document.documentElement; // Or use document.body
  
    // Start observing the target node for configured mutations
    observer.observe(targetNode, config);
  
    console.log("MutationObserver is now observing the entire document.");
  };
  
  // Ensure the observer starts after the document is fully loaded
  document.addEventListener("DOMContentLoaded", startObserving);
  
  // Later, you can stop observing
  // observer.disconnect();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CHECK_MutationObserver_JS")
  {
    sendResponse({ status: "MUTATIONOBSERVER_READY" });
  }
})
