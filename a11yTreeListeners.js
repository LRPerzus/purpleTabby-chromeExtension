// Notify background script when A11y Tree listeners are ready
chrome.runtime.sendMessage({ type: "A11Y_LISTENERS_READY" });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    /* 
        This is used to send message to debug back into background.js
        Cause cannot send background to background
     */
    if (message.type === "Can_Get_Tree") {
        console.log("Received Can_Get_Tree message");
        const tabId = message.tabId;
        console.log("tabId",tabId)

        // Handle the message and process the AX tree in background
        chrome.runtime.sendMessage({ type: "GET_AX_TREE", tabId: tabId });
    }
    // else if (message.type === "A11yTree_DOM_XPATHS")
    // {
    //     const notEmptyNamesXapths = message.data.notEmptyNames;
    //     const foundElements = a11yTreeToDOM(notEmptyNamesXapths);
    //     console.log("IN DOM foundElements",foundElements)
    //     console.log("A11yTree_DOM_XPATHS message.data.tabId",message.data.tabId)
    //     const data =
    //     {
    //         foundElements:foundElements,
    //         tabId : message.data.tabId
    //     }
    //     chrome.runtime.sendMessage({ type: "A11yTree_DOM_XPATHS_DONE", data: data });
    // }
    else if (message.type === "FULL_A11yTree_DOM_XPATHS")
    {
        const foundElements = a11yTreeToDOM();
        const data =
        {
            foundElements:foundElements,
            tabId : message.data.tabId
        }
        chrome.runtime.sendMessage({ type: "A11yTree_DOM_XPATHS_DONE", data: data });
    }
    else if (message.type === "A11yTree_Stored")
    {
        chrome.runtime.sendMessage({ type: "A11yTree_Stored"});
    }
    /* 
        Changes the overlay to add the xpath of the missing
    */
    else if (message.type === "AX_TREE")
    {
        const treeContainer = document.getElementById('treeContent');
        if (treeContainer) {
            treeContainer.textContent = JSON.stringify(message.data, null, 2);
        } else {
            console.error("Element with ID 'treeContent' not found.");
        }
    }

});



function findAllWithAttribute(selector, root = document) {
    const elements = Array.from(root.querySelectorAll(selector));

    // Search through both shadow roots and iframes/frames recursively
    const allElements = root.querySelectorAll('*');
    allElements.forEach(el => {
        // Check for shadow DOM and recursively search
        if (el.shadowRoot) {
            elements.push(...findAllWithAttribute(selector, el.shadowRoot));
        }

        // Check for iframes/frames and recursively search
        if (el.tagName.toLowerCase() === 'iframe' || el.tagName.toLowerCase() === 'frame') {
            try {
                const iframeDocument = el.contentDocument || el.contentWindow.document;
                if (iframeDocument) {
                    elements.push(...findAllWithAttribute(selector, iframeDocument));
                }
            } catch (error) {
                console.warn('Cross-origin iframe or other error:', error);
            }
        }
    });

    return elements;
}


function a11yTreeToDOM()
{
    try {
        const elementsWithPurpleTabby = findAllWithAttribute('[purple_tabby_a11yTree]');
        console.log("a11yTreeToDOM_elementsWithPurpleTabby",elementsWithPurpleTabby)
        console.log()
        const foundElements = []
        elementsWithPurpleTabby.forEach(element => {
            const xpath = getXPath(element)
            if (xpath)
            {
                foundElements.push(xpath);
            }
        });
        console.log("a11yTreeToDOM foundElements",foundElements)
        return foundElements;
    }
    catch(error)
    {
        console.log("a11yTreeToDOM() as an error",error)
    }
    
}
