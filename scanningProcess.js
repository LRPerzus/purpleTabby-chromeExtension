let pageListenerResult = "";
console.log("scanning process injected");

const missing = [];

function inList(a11yTree, xpath) {
    return a11yTree.some(path => path.includes(xpath));
}
  
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "SCAN_COMEPLETE")
    {
        console.log("SCAN_COMEPLETE HELLO?")
        const tab = message.data.tabId;
        const clickableElements = message.data.clickAbleElements;
        const A11yTree = message.data.A11yTree;

        // // Listener for a new tab opening
        // chrome.tabs.onCreated.addListener((tab) => {
        //     console.log('New tab opened:', tab);
        //     pageListenerResult = "link"
        //     // You can perform actions based on the new tab information
        // });
        
        // // Listener for a tab becoming active
        // chrome.tabs.onActivated.addListener((activeInfo) => {
        //     chrome.tabs.get(activeInfo.tabId, (tab) => {
        //     console.log('Tab activated:', tab);
        //     // You can perform actions based on the active tab information
        //     });
        // });
        
        // // Listener for changes in a tab's URL
        // chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        //     if (changeInfo.url) {
        //     console.log('Tab URL changed:', changeInfo.url);
        //     // You can perform actions based on the new URL
        //     }
        // });
        console.log("YAY SCAN COMPLETE");

        // checks if its not in A11y Tree
        clickableElements.forEach(elementXpath => {
            if (!inList(A11yTree,elementXpath))
            {
                
                missing.push(elementXpath);
            }
        });

        console.log("MISSING:",missing);

        const data = {
            tabId:tab,
            missing:missing
        }
        chrome.runtime.sendMessage({ type: "MISSING_FOUND", data: data });
    }

    else if (message.type === "UPDATE_OVERLAY")
    {
        console.log("HELLO UPDATE_OVERLAY")
        const treeContainer = document.getElementById('treeContent');
        if (treeContainer) {
            // Clear it
            treeContainer.innerHTML = "";

            const noMissing = document.createElement("div");
            noMissing.textContent = `There are ${message.data.missing.length} elements missing from the tree.`;
            const missingXpaths = document.createElement("div");
            missingXpaths.textContent = JSON.stringify(message.data.missing, null, 2);
            treeContainer.appendChild(noMissing);
            treeContainer.appendChild(missingXpaths);


        } else {
            console.error("Element with ID 'treeContent' not found.");
        }
    }
})