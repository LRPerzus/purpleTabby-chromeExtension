
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
        
        const loadingSpinner = document.getElementById('spinner');
        const highlightButton = document.querySelector(".purpleTabby #highlightItemsA11yTree");
        const rescanButton = document.querySelector(".purpleTabby #rescanButton");
        const A11yFixes = document.querySelector(".purpleTabby #A11yFixes");
        const resultsDiv = document.getElementById("Results");


        if (loadingSpinner && highlightButton) {
            // hide the spinner
            loadingSpinner.style.display = "none";

            // Unhide button
            highlightButton.style.display = 'block';
            rescanButton.style.display = 'block';
            A11yFixes.style.display = 'block';

            // Create content
            const missingTitle = resultsDiv.querySelector("h2");
            missingTitle.textContent = `There are ${message.data.missing.length} elements missing from the tree.`;

            console.log("MISSING DATA",message.data.framesDict)
            for (const [key, array] of Object.entries(message.data.framesDict)) {
                createFrame(key, array);
            }
            resultsDiv.style.display = "block";


        }
        else {
            console.error("Element with ID 'treeContent' not found.");
        }
    }
})


const rescanButton = document.getElementById('rescanButton');
rescanButton.addEventListener('click', async function() {
    const resultsDiv = document.getElementById("Results");
    resultsDiv.innerHTML='<h2 class="title"> </h2>';
    resultsDiv.style.display="none";

    const loadingSpinner = document.getElementById('spinner');
    loadingSpinner.style.display="block";

    const highlightButton = document.querySelector(".purpleTabby #highlightItemsA11yTree");
    const rescanButton = document.querySelector(".purpleTabby #rescanButton");
    const A11yFixes = document.querySelector(".purpleTabby #A11yFixes");

    // Unhide button
    highlightButton.style.display = 'none';
    rescanButton.style.display = 'none';
    A11yFixes.style.display = 'none';


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


function createFrame(key, array) {
    console.log("createFrame key",key);
    console.log("createFrame array",array);

    // Create a div with class 'frame'
    const frameDiv = document.createElement('div');
    frameDiv.classList.add('frame');

    // Create an element to display the key
    const keyDiv = document.createElement('div');
    keyDiv.classList.add('key');
    if (key === "")
    {
        key = "main body"
    }
    keyDiv.innerHTML = `
        <div id="name">Frame:</div>
        <div id="keyInsert">${key}</div>
    `;
    frameDiv.appendChild(keyDiv);

    // Create an element to display the array associated with the key
    array.forEach(element => {
        const valueDiv = document.createElement('div');
        valueDiv.classList.add('value');
        valueDiv.textContent = element
        frameDiv.appendChild(valueDiv);
    });

    // Append the frame div to the container
    document.getElementById('Results').appendChild(frameDiv);
}