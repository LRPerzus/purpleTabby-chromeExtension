// Event Listeners
const rescanButton = document.getElementById('rescanSwitch');
rescanButton.addEventListener('click', async function() {
    const resultsDiv = document.getElementById("Results");
    resultsDiv.innerHTML='<h2 class="title"> </h2>';
    resultsDiv.style.display="none";

    const loadingSpinner = document.getElementById('spinner');
    loadingSpinner.style.display="block";

    const highlightButton = document.querySelector(".purpleTabby #highlightItemsA11yTreeSwitch");
    const rescanButton = document.querySelector(".purpleTabby #rescanSwitch");
    const A11yFixes = document.querySelector(".purpleTabby #a11yFixesSwitch");

    // Unhide button
    highlightButton.parentElement.style.display = 'none';
    rescanButton.parentElement.style.display = 'none';
    A11yFixes.parentElement.style.display = 'none';


    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log(`Current tab ID: ${tab.id}`);
    chrome.runtime.sendMessage({ type: "RESCAN_INNIT" , tabId:tab.id});
});

const highlightButton = document.getElementById("highlightItemsA11yTreeSwitch");
highlightButton.addEventListener('click', async function() {
    // Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log(`Current tab ID: ${tab.id}`);
    chrome.runtime.sendMessage({ type: "HIGHLIGHT_MISSING" , tabId:tab.id});
});

const a11yFix = document.getElementById("a11yFixesSwitch");
a11yFix.addEventListener('click', async function() {
    // Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log(`Current tab ID: ${tab.id}`);
    chrome.runtime.sendMessage({ type: "A11YFIXES_INNIT" , tabId:tab.id});
});