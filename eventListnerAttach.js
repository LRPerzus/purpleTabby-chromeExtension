// Event Listeners
const debuggerAttachSwitch = document.getElementById('debuggerAttach');
debuggerAttachSwitch.addEventListener('click', async function() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log(`Current tab ID: ${tab.id}`);    
    if (debuggerAttachSwitch.checked)
    {
        console.log("attach it");
        debuggerAttachSwitch.checked = true;
        chrome.runtime.sendMessage({ type: "DEBUGGER_ATTACH" , tabId:tab.id, status:true});
    }
    else 
    {
        console.log("dettach it");
        debuggerAttachSwitch.checked = false;
        chrome.runtime.sendMessage({ type: "DEBUGGER_DETTACH" , tabId:tab.id, status:false});
    }
});

const highlightButton = document.getElementById("highlightItemsA11yTreeSwitch");
highlightButton.addEventListener('click', async function() {
    // Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log(`Current tab ID: ${tab.id}`);
    let status;
    if (highlightButton.checked)
    {
        status = true;
    }
    else
    {
        status = false;
    }
    chrome.runtime.sendMessage({ type: "HIGHLIGHT_MISSING" , tabId:tab.id, status:status});
});

const a11yFix = document.getElementById("a11yFixesSwitch");
a11yFix.addEventListener('click', async function() {
    // Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log(`Current tab ID: ${tab.id}`);
    let status;
    if (a11yFix.checked)
    {
        status = true;
    }
    else
    {
        status = false;
    }
    chrome.runtime.sendMessage({ type: "A11YFIXES_INNIT" , tabId:tab.id,status:status});
});