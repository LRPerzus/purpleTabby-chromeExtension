// Notify background script when A11y Tree listeners are ready
chrome.runtime.sendMessage({ type: "A11Y_LISTENERS_READY" });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "Can_Get_Tree") {
        console.log("Received Can_Get_Tree message");
        const tabId = message.tabId;
        console.log("tabId",tabId)
        // Handle the message and process the AX tree
        chrome.runtime.sendMessage({ type: "GET_AX_TREE", tabId: tabId });
    }
    else if (message.type === "AX_TREE")
    {
        const treeContainer = document.getElementById('treeContent');
        if (treeContainer) {
            treeContainer.textContent = JSON.stringify(message.data, null, 2);
        } else {
            console.error("Element with ID 'treeContent' not found.");
        }
    }
    else if (message.type === "A11yTree_DOM_XPATHS")
    {
        const notEmptyNamesXapths = message.data.notEmptyNames;
        const foundElements = a11yTreeToDOM(notEmptyNamesXapths);
        console.log("IN DOM foundElements",foundElements)
        const data =
        {
            foundElements:foundElements,
            tabId : message.data.tabId
        }
        chrome.storage.local.set({ foundElements: foundElements }, function() {
            chrome.runtime.sendMessage({ type: "A11yTree_DOM_XPATHS_DONE", data: data });
        });                
    }
});

