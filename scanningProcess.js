let pageListenerResult = "";
console.log("scanning process injected");


function inList(a11yTree, xpath) {
    return a11yTree.some(path => xpath.startsWith(path));
}
  
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "SCAN_COMEPLETE")
    {
        console.log("SCAN_COMEPLETE HELLO?")
        const missing = [];

        const tab = message.data.tabId;
        const clickableElements = message.data.clickAbleElements;
        const A11yTree = message.data.A11yTree;
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
        const highlightButton = document.querySelector(".purpleTabby #highlightItemsA11yTree");
        const rescanButton = document.querySelector(".purpleTabby #rescanButton");


        if (treeContainer && highlightButton) {
            // Unhide button
            highlightButton.style.display = 'block';
            rescanButton.style.display = 'block';

            // Clear it
            treeContainer.value = ""; // Clear the textarea content

            // Create content
            const noMissingMessage = `There are ${message.data.missing.length} elements missing from the tree.\n`;
            const missingXpaths = JSON.stringify(message.data.missing, null, 2); // Format JSON with indentation

            // Set content to textarea
            treeContainer.value = noMissingMessage + missingXpaths;
        }
        else {
            console.error("Element with ID 'treeContent' not found.");
        }
    }
})