// Notify background script when getClickable is ready
chrome.runtime.sendMessage({ type: "GET_CLICKABLE_READY" });

// Your getClickable code
console.log("Listeners Set");