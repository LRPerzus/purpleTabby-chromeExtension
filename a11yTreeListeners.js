// Notify background script when A11y Tree listeners are ready
chrome.runtime.sendMessage({ type: "A11Y_LISTENERS_READY" });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Received message in content script:", message);

    if (message.type === "Can_Get_Tree") {
        console.log("Received Can_Get_Tree message");
        const tabId = message.tabId;
        console.log("tabId", tabId);
        // Handle the message and process the AX tree
        chrome.runtime.sendMessage({ type: "GET_AX_TREE", tabId: tabId });
    } else if (message.type === "AX_TREE") {
        const treeContainer = document.getElementById('treeContent');
        if (treeContainer) {
            treeContainer.textContent = JSON.stringify(message.data.tree, null, 2);
        } else {
            console.error("Element with ID 'treeContent' not found.");
        }
        chrome.storage.local.set({ accessibilityTree: message.data.tree }, () => {
            console.log("Tree data saved to Chrome storage.");
        });
    }
});


