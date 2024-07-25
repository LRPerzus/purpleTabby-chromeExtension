chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.type === "GET_AX_TREE") {
      try {
        await attachDebugger(request.tabId);
        await enableAccessibility(request.tabId);
        const rootNode = await getRootAXNode(request.tabId);
        const fullTree = await fetchFullAccessibilityTree(request.tabId, rootNode.node);
        chrome.runtime.sendMessage({ type: "AX_TREE", data: fullTree });
      } catch (error) {
        console.error(error);
      } finally {
        try {
          await detachDebugger(request.tabId);
        } catch (error) {
          console.error("Error detaching debugger: ", error);
        }
      }
    }
  });
  
  async function attachDebugger(tabId) {
    return new Promise((resolve, reject) => {
      chrome.debugger.attach({ tabId }, "1.3", () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }
  
  async function detachDebugger(tabId) {
    return new Promise((resolve, reject) => {
      chrome.debugger.detach({ tabId }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }
  
  async function enableAccessibility(tabId) {
    return new Promise((resolve, reject) => {
      chrome.debugger.sendCommand({ tabId }, "Accessibility.enable", {}, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }
  
  async function getRootAXNode(tabId) {
    return new Promise((resolve, reject) => {
      chrome.debugger.sendCommand({ tabId }, "Accessibility.getRootAXNode", {}, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result);
        }
      });
    });
  }
  
  async function fetchFullAccessibilityTree(tabId, node) {
    if (!node.childIds || node.childIds.length === 0) {
      return node;
    }
  
    node.children = [];
  
    for (const childId of node.childIds) {
      const childNode = await new Promise((resolve, reject) => {
        chrome.debugger.sendCommand({ tabId }, "Accessibility.getChildAXNodes", { id: childId }, (childResult) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(childResult.nodes[0]);
          }
        });
      });
  
      if (childNode) {
        node.children.push(await fetchFullAccessibilityTree(tabId, childNode));
      }
    }
  
    return node;
  }
  