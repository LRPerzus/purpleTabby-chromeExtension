
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Popup opened and script running!');

    // Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log(`Current tab ID: ${tab.id}`);

    // Send "PlUGIN_CLICKED" message to the background script
    chrome.runtime.sendMessage({ type: "PlUGIN_CLICKED", tabId: tab.id });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "PLUGIN_READY")
    {
        chrome.runtime.sendMessage({ type: "OVERLAY_CREATED"});
        sendResponse({ success: true });
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
            const missingXpaths = JSON.stringify(message.data.framesDict, null, 2); // Format JSON with indentation

            // Set content to textarea
            treeContainer.value = noMissingMessage + missingXpaths;
        }
        else {
            console.error("Element with ID 'treeContent' not found.");
        }
    }
})


const rescanButton = document.getElementById('rescanButton');
rescanButton.addEventListener('click', async function() {
    treeContent.value = ""; // Clear the textarea content
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log(`Current tab ID: ${tab.id}`);
    chrome.runtime.sendMessage({ type: "RESCAN_INNIT" , tabId:tab.id});
});

const highlightButton = document.getElementById("highlightItemsA11yTree");
highlightButton.addEventListener('click', async function() {
    // Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log(`Current tab ID: ${tab.id}`);
    chrome.runtime.sendMessage({ type: "HIGHLIGHT_MISSING" , tabId:tab.id});
});

const a11yFix = document.getElementById("A11yFixes");
a11yFix.addEventListener('click', async function() {
    // Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log(`Current tab ID: ${tab.id}`);
    chrome.runtime.sendMessage({ type: "A11YFIXES_INNIT" , tabId:tab.id});
});

