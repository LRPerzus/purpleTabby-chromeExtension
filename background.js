// background.js

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "findElementById") {
      chrome.debugger.attach({ tabId: sender.tab.id }, "1.3", () => {
        chrome.debugger.sendCommand(
          { tabId: sender.tab.id },
          "DOM.getDocument",
          {},
          (result) => {
            if (chrome.runtime.lastError) {
              console.error(chrome.runtime.lastError);
              sendResponse({ success: false, error: chrome.runtime.lastError });
              return;
            }
  
            // Find the element by backendDOMNodeId
            findElement(result.root.nodeId, message.backendDOMNodeId, sendResponse);
          }
        );
      });
  
      // Keep the message channel open for asynchronous response
      return true;
    }
  });
  
  function findElement(rootNodeId, backendDOMNodeId, callback) {
    chrome.debugger.sendCommand(
      { tabId: sender.tab.id },
      "DOM.querySelector",
      { nodeId: rootNodeId, selector: `[data-backend-node-id="${backendDOMNodeId}"]` },
      (result) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          callback({ success: false, error: chrome.runtime.lastError });
          return;
        }
  
        callback({ success: true, nodeId: result.nodeId });
      }
    );
  }
  