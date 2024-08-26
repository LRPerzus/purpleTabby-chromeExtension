// Your getClickable code
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === "Can_find_clickable")
  {
    try {
      const clickableElements = await getClickableItems();
      const tabId = message.tabId;
      console.log("Can_find_clickable tabId", tabId);    
      chrome.runtime.sendMessage({ type: "clickableElements_XPATHS_DONE", clickableElements: clickableElements, tabId: tabId });
    } catch (error) {
      if (error instanceof ReferenceError && error.message.includes("getClickableItems")) {
        console.log("Send Error message")
        const refreshText = "Please Reload Page to access extension";
        const treeContainer = document.getElementById('treeContent');
        treeContainer.textContent = refreshText;
        chrome.runtime.sendMessage({ type: "ERROR_REFRESHNEED"});

      } else {
        console.error("An unexpected error occurred", error);
      }
    }
  }
  else if (message.type === "clickable_stored")
  {
    chrome.runtime.sendMessage({ type: "clickable_stored"});
  }
  else if (message.type === "CHECK_CLICKABLE_ELEMENTS_LISTENERS_JS")
  {
    sendResponse({ status: "CLICKABLE_ELEMENTS_READY" });
  }
})