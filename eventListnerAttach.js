// Event Listeners
const debuggerAttachSwitch = document.getElementById('debuggerAttach');
debuggerAttachSwitch.addEventListener('click', async function() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log(`Current tab ID: ${tab.id}`);
    if (!debuggerAttachSwitch.hasAttribute("checked"))
    {
        console.log("attach it");
        debuggerAttachSwitch.setAttribute("checked","true");
        chrome.runtime.sendMessage({ type: "DEBUGGER_ATTACH" , tabId:tab.id});
    }
    else 
    {
        console.log("dettach it");
        debuggerAttachSwitch.removeAttribute("checked");
        chrome.runtime.sendMessage({ type: "DEBUGGER_DETTACH" , tabId:tab.id});
    }
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