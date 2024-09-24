let isStable = false;
let hasMutations = false;
let isConnectedDebuuger = true; // Variable to track connection status
let timeout; // Timeout for stability check
let tabId;

chrome.runtime.sendMessage({ type: 'GET_TAB_ID' }, (response) => {
  if (response && response.tabId) {
      console.log('Tab ID:', response.tabId);
      tabId = response.tabId;
  }
});

chrome.runtime.sendMessage({type: "TEST_CONNECTION"}, function(response) {
  if (response && response.status === "connected") {
    console.log("Content script is connected to the background script.");
  } else {
     isConnectedDebuuger = false;
     console.log("not conntected");
  }
});

// Callback function to execute when mutations are observed
const callback = async (mutationList, observer) => {
  hasMutations = true;  // Mark that a mutation occurred
  let shouldResetTimeout = false;

  // Async function to check nodes in addedNodes and removedNodes
  const checkNodes = async (nodes) => {
    return Promise.all(Array.from(nodes).map(async (node) => {
      // Only consider non-script nodes for resetting the timeout
      if (node.nodeName !== "SCRIPT" ) {
        return true;  // Indicates that a non-script node was added or removed
      }
      return false;
    }));
  };

  // Loop through each mutation record and check addedNodes and removedNodes
  for (const mutation of mutationList) {
    if (mutation.type === "childList") {
      // Check addedNodes asynchronously
      const addedNodesResult = await checkNodes(mutation.addedNodes);
      // Check removedNodes asynchronously
      const removedNodesResult = await checkNodes(mutation.removedNodes);

      // If any added or removed nodes are non-script elements, reset timeout
      if ((addedNodesResult.includes(true) || removedNodesResult.includes(true)) && isVisibleFocusAble(mutation.previousSibling)) {
        console.log(mutation);
        shouldResetTimeout = true;
        if(isStable)
        {
          console.log("A non-script node has been added or removed.");
          console.log(mutation);
          // Reset Stable
          isStable = false;
        }
      }
    }
    else if (mutation.type === "attributes" && 
      isVisibleFocusAble(mutation.target) && 
      // DO NOT TOUCH IF IT IS THE ATTRIBUTES WE ADDED IN
      mutation.attributeName !== "tabby-has-listener" && 
      mutation.attributeName !== "purple_tabby_a11ytree" &&
      mutation.attributeName !== "style" &&
      mutation.attributeName !== "purple_tabby_missing" &&
      mutation.attributeName !== "aria-label"
    ) {
      console.log(mutation)
      // Attribute changes are considered significant for resetting the timeout
      shouldResetTimeout = true;
      if(isStable)
      {
        console.log("An attribute has been changed.");
        console.log(mutation);
        // Reset Stable
        isStable = false;
      }
    }
  }

  // Reset the timeout only if non-script nodes were added or removed
  if (shouldResetTimeout) {
    clearTimeout(timeout); // Reset the timeout

    // Set a new timeout to check for DOM stability after 1 second of no changes
    timeout = setTimeout(() => {
      isStable = true;       // Mark the DOM as stable
      console.log("DOM stabilized after mutations.");
      // There is an error on attribute when I add stuff resulting in infinite loops
      if (isConnectedDebuuger)
      {
        try
        {
          chrome.runtime.sendMessage({ type: "SCANING_START",tabId:tabId,debugger:"Hey from debugger",from:"CALL AFTER MUTATOION"}); 
        }
        catch (e)
        {
          if (e.message === "Extension context invalidated.")
          {
            console.warn("UPDATED EXTENSION PLEASE REFRESH");
          }
          else{
            console.error(e.message);
          }
        }
      }
    }, 1000);
  }
};


// Create an observer instance linked to the callback function
const observer = new MutationObserver(callback);

// Options for the observer (which mutations to observe)
const config = {childList: true, subtree: true , attributes:true};
// subtree is needed to look into the children nodes of the attached section

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
      isStable = true;       // Mark the DOM as stable
      console.log("No mutations detected after DOMContentLoaded, setting DOM as stable.");
      if (isConnectedDebuuger)
      {
        chrome.runtime.sendMessage({ type: "SCANING_START" , from:"MUTATION OBSERVER"}); 
      }
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
  if (message.type === "CHECK_MUTATIONOBSERVER_JS") {
    sendResponse({ status: "MUTATIONOBSERVER_READY" });
  }
});
