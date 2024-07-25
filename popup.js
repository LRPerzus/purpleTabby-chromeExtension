document.addEventListener('DOMContentLoaded', () => {
    // Listener for incoming messages
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === "AX_TREE") {
        const treeContainer = document.getElementById('treeContent');
        if (treeContainer) {
          treeContainer.textContent = JSON.stringify(message.data, null, 2);
        } else {
          console.error("Element with ID 'treeContent' not found.");
        }
      }
    });
  
    // Request the AX tree when the popup opens
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.runtime.sendMessage({ type: "GET_AX_TREE", tabId: tabs[0].id });
      } else {
        console.error("Unable to get the active tab.");
      }
    });
  });
  