// Run immediately after injection
console.log("popup.js being injected");

function handleAXTreeMessage(message) {
  if (message.type === "AX_TREE") {
    const treeContainer = document.getElementById('treeContent');
    if (treeContainer) {
      treeContainer.textContent = JSON.stringify(message.data.tree, null, 2);
    } else {
      console.error("Element with ID 'treeContent' not found.");
    }
  }
}

console.log("DOMContentLoaded");
// Set up message listener immediately
chrome.runtime.onMessage.addListener(handleAXTreeMessage);

// Request the AX tree when the script is injected
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
if (tabs[0] && tabs[0].id) {
    console.log("Sending Message");
    chrome.runtime.sendMessage({ type: "GET_AX_TREE", tabId: tabs[0].id });
} else {
    console.error("Unable to get the active tab.");
}
});
