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

        // Checks if it's not in A11yTree and doesn't have children with the specific attribute
        clickableElements.forEach(elementXpath => {
            // Evaluate the XPath expression to find the parent node
            const parentResult = document.evaluate(
                elementXpath, // XPath expression
                document, // Context node (document root)
                null, // Namespace resolver (null if not needed)
                XPathResult.FIRST_ORDERED_NODE_TYPE, // Result type to get the first matching node
                null // Result object (null if not reusing an existing result)
            );

            // Retrieve the parent element
            const parent = parentResult.singleNodeValue;

            if (parent && !inList(A11yTree, elementXpath)) {
                // Evaluate XPath to find any descendants with the attribute
                const descendantResult = document.evaluate(
                    './/*[@purple_tabby_a11ytree="true"]', // XPath expression to find any descendants
                    parent, // Context node (parent element)
                    null, // Namespace resolver (null if not needed)
                    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, // Result type to get all matching nodes
                    null // Result object (null if not reusing an existing result)
                );

                // Check if any descendants with the attribute were found
                if (descendantResult.snapshotLength === 0) {
                    // Add to missing list if no descendants with the attribute are found
                    missing.push(elementXpath);
                }
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
        const A11yFixes = document.querySelector(".purpleTabby #A11yFixes");


        if (treeContainer && highlightButton) {
            // Unhide button
            highlightButton.style.display = 'block';
            rescanButton.style.display = 'block';
            A11yFixes.style.display = 'block';
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