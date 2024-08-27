import {getFromLocal} from "./localStorageFunc.js"
/* 
    Function to set attribute purple_tabby_a11yTree to DOM items via Debugger DOM commands
    Reason: 
        We want to find the direct items from the A11yTree using the backendDomId we can find the node of the DOM.
        Once we find the corresponding node we can set our own unique attribute so that we can extract them directly
    
    Parameters:
        tabId: the tabId you want to affect
        nodeId: the nodeId of which you want to add the attribute
    
    Returns:
        True or False if its been attached (Currently broken)
*/
export async function setAttributeValue(tabId, nodeId,name) {
    const value = "true"; // This is the value to set
    
    // Step 1: Set the attribute
    await new Promise((resolve, reject) => {
        chrome.debugger.sendCommand({ tabId }, 'DOM.setAttributeValue', {
            nodeId,
            name,
            value
        }, (result) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            resolve(result);
        });
    });

    // Step 2: Verify the attribute was set correctly
    return new Promise((resolve, reject) => {
        chrome.debugger.sendCommand({ tabId }, 'DOM.getAttributes', { nodeId }, (result) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            const attributes = result.attributes;
            const attribute = attributes.find(attr => attr.name === name);
            
            if (attribute && attribute.value === value) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
}

/*
    Function that is used after each finished message for A11y Tree and get clickableElements to check if the scan is finished
    It checks if in the local storage stores both A11yTree and clickableElements.
*/
export async function areScansFinished(tabId)
{
    let A11yTree = null; 
    let clickAbleElements = null;
    const currentClick = await getFromLocal(tabId,"noClicks")
    console.log("currentClick",currentClick);
    
    try {
        const foundElements = await getFromLocal(tabId,"foundElements",currentClick);
        console.log("GET FROM LOCAL foundElements", foundElements)
        if (foundElements && foundElements.length > 0) {
            A11yTree = foundElements;
            console.log('A11yTree:', A11yTree);
            // Do something with A11yTree
        } else {
            console.log('foundElements does not exist or is empty');
        }
    } catch (error) {
        console.error('Error retrieving foundElements:', error);
        // A11yTree remains null if there's an error
    }

    // For clickable
    try {
        const clickable = await getFromLocal(tabId,"clickableElements",currentClick);
        console.log("GET FROM LOCAL clickableElements", clickable)
        if (clickable && clickable.length > 0) {
            clickAbleElements = clickable;
            console.log('clickableElements:', clickAbleElements);
            // Do something with A11yTree
        } else {
            console.log('clickableElements does not exist or is empty');
        }
    } catch (error) {
        console.error('Error retrieving clickableElements:', error);
        // A11yTree remains null if there's an error
    }

    if ( A11yTree !== null && clickAbleElements !== null)
        {
            console.log("YAY ITS ALL DONE");
            const data = 
            {
                clickAbleElements:clickAbleElements,
                A11yTree: A11yTree,
                tabId, tabId
            }
            chrome.tabs.sendMessage(tabId, { type: "SCAN_COMEPLETE", data:data });

        }
    
}