// Notify background script when getClickable is ready
chrome.runtime.sendMessage({ type: "GET_CLICKABLE_READY" });

// Your getClickable code
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === "Can_find_clickable")
  {
    const clickableElements = await getClickableItems();
    const tabId = message.tabId;
    console.log("Can_find_clickable tabId",tabId);
    console.log("clickableElements",clickableElements);
    
    chrome.runtime.sendMessage({ type: "clickableElements_XPATHS_DONE", clickableElements:clickableElements,tabId:tabId });
  }
  else if (message.type === "clickable_stored")
  {
    chrome.runtime.sendMessage({ type: "clickable_stored"});
  }
})