// Imported Functions
import {getFrameTree,processFrameTrees,settingAttributeNode} from "./background functions/frameTreesFuncs.js"
import {collectDOMNodes} from "./background functions/domTreeFunc.js"
import {setAttributeValue,areScansFinished} from "./background functions/common.js"
import {storeDataForTab,clearLocalStorage,getFromLocal} from "./background functions/localStorageFunc.js"

// Set Variables
let firstClick = {};
let debuggerAttached = {};
let settings = {};

// --- Event Listeners from the injecte scripts to here
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.type === "PlUGIN_CLICKED") {
        const tabId = request.tabId;
        try {
            // Clear data for the tab if needed
            // await clearDataForTab(tabId);
        
            // Attaches the number of clicks
            await updateNoClicksTabID(tabId);
        
            const scriptChecks = [
                { name: "content.js", message: "CHECK_CONTENT_JS", status: "CONTENT_READY" },
                { name: "scanningProcess.js", message: "CHECK_SCANNING_PROCESS_JS", status: "SCANNING_PROCESS_READY" },
                { name: "a11yTreeListeners.js", message: "CHECK_A11Y_TREE_LISTENERS_JS", status: "A11Y_LISTENERS_READY" },
                { name: "getClickableElementsListeners.js", message: "CHECK_CLICKABLE_ELEMENTS_LISTENERS_JS", status: "CLICKABLE_ELEMENTS_READY" },
                { name: "overlayListeners.js", message: "CHECK_OVERLAY_LISTENERS_JS", status: "OVERLAY_LISTENERS_READY" },
                { name: "getClickableItems.js", message: "CHECK_GETCLICKABLE_JS", status: "GET_GETCLICKABL_READY" },
                { name:"attachMutationObserver.js",message:"CHECK_MutationObserver_JS",status:"MUTATIONOBSERVER_READY"}
            ];
        
            const missingScripts = [];
        
            for (const check of scriptChecks) {
                try {
                    console.log("check.status:", check.status);
                    await sendMessageAndWait(tabId, check.message, check.status);
                    console.log(`${check.name} is already injected.`);
                } catch {
                    console.log(`${check.name} is not injected.`);
                    missingScripts.push(check.name);
                }
            }
        
            if (missingScripts.length > 0) {
                console.log("Missing scripts:", missingScripts.join(", "));
                await injectMissingScripts(tabId, missingScripts);
            } else {
                console.log("All scripts are loaded and ready.");
            }

            // Set the settingStatus
            if (!settings[tabId])
            {
                settings[tabId] = 
                {
                    highlight:true,
                    continousScanning:true,
                    A11yFix:true,
                }
            }
        
            // Now that all scripts are ready, send the "OVERLAY_CREATED" message
            chrome.runtime.sendMessage({ type: "PLUGIN_READY", tabId: tabId }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Failed to send 'PLUGIN_READY' message:", chrome.runtime.lastError.message);
                } else {
                    console.log("'PLUGIN_READY' message sent successfully.");
                }
            });
        
        } catch (error) {
            console.error("Error waiting for scripts:", error);
        }
    }
    else if (request.type === "HIGHLIGHT_MISSING")
    {
        console.log("HIGHLIGHT_MISSING Received",request.tabId);
        const missingXpath = await getFromLocal(request.tabId,"missingXpath");
        let data;
        if (missingXpath !== undefined)
        {
            data = missingXpath;
        }
        else{
            data = "undefined"
        }
        console.log("HIGHLIGHT_MISSING missingXpath",missingXpath)
        chrome.tabs.sendMessage(request.tabId, { type: "HIGHLIGHT", data:data.framesDict });
        
    }
    else if (request.type === "RESCAN_INNIT")
    {
        console.log("Rescanning",request.tabId);
        // firstClick[request.tabid] = request.tabid.url;
        
        // updates the number
        await updateNoClicksTabID(request.tabId,true);
        chrome.tabs.sendMessage(request.tabId, { type: "START_RESCANNING" , tabId:request.tabId});
    }
    else if (request.type === "OVERLAY_CREATED") {
        console.log("Overlay created, preparing to request AX tree and clickableElements.");
        const tabId = request.tabId;
        console.log("OVERLAY_CREATED tabId",tabId)
        const missingXpaths = await getFromLocal(request.tabId,"missingXpath");
        console.log("OVERLAY_CREATED missingXpaths",missingXpaths);

        if (missingXpaths !== undefined || (await isDebuggerAttached(request.tabId) === undefined || !debuggerAttached[tabId] && debuggerAttached[tabId] !== true))
        {
            chrome.runtime.sendMessage({type: "UPDATE_OVERLAY",data:missingXpaths});
        }
        else
        {
            chrome.runtime.sendMessage({ type: "SCANNING_INNIT", tabId:tabId});        
        }
        // Return true to indicate the response will be sent asynchronously
        return true;
    }
    else if (request.type === "SCANING_START")
    {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            let tabId = tabs[0]?.id || request.tabId;
            if (tabId) {
                if (request.tabId)
                {
                    if (request.tabId === tabId)
                    {
                        tabId = request.tabId;
                        console.log("Sending Can get messages to tabId:", tabId);
                        chrome.tabs.sendMessage(tabId, { type: "Can_Get_Tree", tabId: tabId });
                        chrome.tabs.sendMessage(tabId, { type: "Can_find_clickable", tabId: tabId });
                        sendResponse({ success: true });
                    }
                    else
                    {
                        console.log(`The active tab has moved (tabId Query ${tabId} | request.tabId ${request.tabId})`);
                        sendResponse({ success: false });
                    }
                }
                else
                {
                    chrome.tabs.sendMessage(tabId, { type: "Can_Get_Tree", tabId: tabId });
                    chrome.tabs.sendMessage(tabId, { type: "Can_find_clickable", tabId: tabId });
                    sendResponse({ success: true });
                }
            } else {
                console.error("Unable to get the active tab.");
                sendResponse({ success: false, error: "Unable to get the active tab." });
            }
        });

        // Return true to indicate the response will be sent asynchronously
        return true;
    }
    else if (request.type === "GET_AX_TREE") {
        // console.log("Message received in background script:", request);
        try {
            const tabId = request.tabId;
            console.log("When GET_AX_TREE is triggered debugger is:",isDebuggerAttached(tabId));

            if (await isDebuggerAttached(request.tabId) === undefined || !debuggerAttached[tabId] && debuggerAttached[tabId] !== true)
            {
                await attachDebugger(tabId);
                debuggerAttached[tabId] = true;
            }
            await enableAccessibility(tabId);
            await enableDOMDomain(tabId)

            // Full DOM DICT TREE
            const frameTreePromise = getFrameTree(tabId);
            
            // Run collectDOMNodes and processFrameTrees concurrently
            const [domResults, frameTreeResults] = await Promise.all([
                collectDOMNodes(tabId),
                frameTreePromise.then(frameTree => processFrameTrees(tabId, frameTree))
            ]).catch(error => {
                console.error("Error in Promise.all:", error);
            });

            console.log("CAN I GET HERE?");

            // Access the results
            const { nodeMap, resolveNodes, eventListnersList } = domResults;
            const allFrameNames = frameTreeResults;
            
            const domDictionary = nodeMap; 
            console.log("domDictionary",domDictionary); 
            // console.log("resolveNodes",resolveNodes);
            // console.log("eventListnersList",eventListnersList);

            // Set Attribute tabby-has-listener = "true"
            await addAttributeEventList(tabId,domDictionary,eventListnersList);

            // Set Attribute purple_tabby_a11yTree
            await settingAttributeNode(tabId, allFrameNames, domDictionary);

           
            // Find the Xpaths in the DOM
            const data = {
                tabId:tabId,
            }
            if (debuggerAttached)
            {   
                console.log("Dettaching")
                await detachDebugger(tabId);
            }

            // To force a download
            // const json = JSON.stringify(fullA11yTree, null, 2);

            // // Send the data to the content script or popup
            // chrome.tabs.sendMessage(tabId,{
            //     type: "DOWNLOAD_Name_A11yTree",
            //     data: json
            // });

            chrome.tabs.sendMessage(tabId, { type: "FULL_A11yTree_DOM_XPATHS", data: data }); 
            // Use chrome tab cause runtime is not the same
            // Tabs are used to send back to another script 


        } catch (error) {
            console.error("Error processing AX Tree:", error, JSON.stringify(error));
        }
    }
    else if (request.type === "A11yTree_DOM_XPATHS_DONE")
    {
        const noClicks = await getFromLocal(request.data.tabId,"noClicks")
        console.log("A11y Tree noClicks:",noClicks)
        console.log("A11yTree_DOM_XPATHS_DONE request.data.tabId",request.data.tabId)
        storeDataForTab(request.data.tabId,request.data.foundElements,"foundElements",noClicks);
        chrome.tabs.sendMessage(request.data.tabId,{ type: "A11yTree_Stored" });


        const inStorage = await getFromLocal(request.data.tabId,"foundElements",noClicks)
        console.log("inStorage foundElement",inStorage);
        
        const foundElement = request.data.foundElements;
        const tabId = request.data.tabId;
        console.log("foundElement",foundElement)

        await areScansFinished(tabId);        
    }
    else if (request.type === "clickableElements_XPATHS_DONE")
    {
        let noClicks = await getFromLocal(request.tabId,"noClicks");
        if (noClicks === undefined) // there is a possibility that it runs too fast faster than the localStorage collection
        {
            let count = 0
            while (noClicks === undefined && count <= 3)
            {
                console.warn("noclicks for storage is not defined");
                noClicks = await getFromLocal(request.tabId,"noClicks");
                count++;
            }
        }

        storeDataForTab(request.tabId,request.clickableElements,"clickableElements",noClicks)
        // chrome.tabs.sendMessage(request.tabId,{ type: "clickable_stored" });

        
        const inStorage = await getFromLocal(request.tabId,"clickableElements",noClicks)
        console.log("inStorage clickableElements",request.tabId,noClicks,inStorage);

        await areScansFinished(request.tabId);

    }

    else if (request.type === "MISSING_FOUND")
    {
        // STORE MISSINGXAPATHS
        storeDataForTab(request.data.tabId,request.data,"missingXpath");
        try {
            chrome.runtime.sendMessage({ type: "POPUP_STATUS" }, (response) => {
                if (chrome.runtime.lastError) {
                    if ( chrome.runtime.lastError.message.includes("Receiving end does not exist."))
                    {
                        console.log("POPUP IS NOT OPEN");
                    }
                    return; // Exit the callback if there's an error
                }
        
                if (response && response.success) {
                    console.log("Popup status response received:", response);
                    console.log("Stored in missingXpath:", request.data);
                    const tabId = request.data.tabId;
                    // Send the data to the content script or popup
                    chrome.runtime.sendMessage({
                        type: "UPDATE_OVERLAY",
                        data: request.data
                    });
                } else {
                    console.log("No response or unsuccessful status.");
                }
            });
        } catch (e) {
            console.error("Caught error:", e.message);
        }        
    }

    else if (request.type === "A11YFIXES_INNIT")
    {
        const tabId = request.tabId;
        const missingXpaths = await getFromLocal(tabId,"missingXpath");

        console.log("A11YFIXES_INNIT missingXpaths:",missingXpaths);
        chrome.tabs.sendMessage(tabId,{ type: "A11YFIXES_Start", missingXpaths:missingXpaths.framesDict});
    }
    else if (request.type === "ERROR_REFRESHNEED")
    {
        console.log("ERROR_REFRESHNEED");
        const tabId = sender.tab.id;
        firstClick[tabId] = "ERROR";
    }
    else if(request.type === "COPY_ALL")
    {
        try {
            const tabId = request.tabId;
            console.log("Handling COPY_ALL for tabId:", tabId);
            const missingXpaths = await getFromLocal(tabId, "missingXpath");
            console.log("Missing XPaths retrieved:", missingXpaths.framesDict);
            sendResponse({ success: true, data: missingXpaths.framesDict});
        } catch (error) {
            console.error("Error fetching data:", error);
            sendResponse({ success: false, error: error.message });
        }
        // Indicates that the response is asynchronous
        return true;
    }
    else if (request.type === "GET_TAB_ID")
    {
        if (sender.tab && sender.tab.id) {
            sendResponse({ tabId: sender.tab.id });
        } else {
            sendResponse({ tabId: null });
        }
    }
    else if (request.type === "TEST_CONNECTION")
    {
        sendResponse({status: "connected"});
    }
    
    return true; // Indicate that you will send a response asynchronously
});

// -- Functions

/* 
    Function to attach attribute to elements with eventListners
*/
async function addAttributeEventList(tabId, domDictionary, eventListnersList) {
    const promises = Object.keys(eventListnersList).map(async (backendDOMNodeId) => {
        try {
            // console.log("addAttributeEventList_backendDOMNodeId", backendDOMNodeId);
            const correspondingNodeId = domDictionary[backendDOMNodeId];
            if (!correspondingNodeId) {
                console.error(`No corresponding node found for backendDOMNodeId: ${backendDOMNodeId}`);
                return; // Skip this node
            }
            await setAttributeValue(tabId, correspondingNodeId, "tabby-has-listener");
        } catch (error) {
            console.error(`Failed to set attribute for backendDOMNodeId: ${backendDOMNodeId}`, error);
        }
    });

    // Wait for all promises to resolve
    await Promise.all(promises);
}



/* 
    Function to attach debugger to a tab
*/
async function attachDebugger(tabId) {
    console.log("attachDebugger tabId",tabId)
    if (debuggerAttached[tabId]) return;

    return new Promise((resolve, reject) => {
        chrome.debugger.attach({ tabId }, "1.3", () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                debuggerAttached[tabId] = true;
                resolve();
            }
        });
    });
}

/* 
    Function to dettach debugger to a tab
*/
async function detachDebugger(tabId) {
    if (!debuggerAttached[tabId]) return;

    return new Promise((resolve, reject) => {
        chrome.debugger.detach({ tabId }, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                debuggerAttached[tabId] = false;
                resolve();
            }
        });
    });
}

/* 
    Function to enable Accessibility so that the A11yTree can get
    using Debugger commands
    Note* Debugger needs to attached before in order for commands to be sent
*/
async function enableAccessibility(tabId) {
    return new Promise((resolve, reject) => {
        chrome.debugger.sendCommand({ tabId }, "Accessibility.enable", {}, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve();
            }
        });
    });
}

/* 
    Function to Enable the DOM domain 
*/
function enableDOMDomain(tabId) {
    return new Promise((resolve, reject) => {
      chrome.debugger.sendCommand({tabId: tabId}, 'DOM.enable', {}, () => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }
        resolve();
      });
    });
  }


//function store and increase the number no of scans
async function updateNoClicksTabID(tabId, change = false) {
    const keyClicks = `tab_${tabId}_noClicks`;

    // Check if the key exists and get its current value
    chrome.storage.local.get(keyClicks, (result) => {
        console.log("updateNoClicksTabID result:",result);
        if (result[keyClicks]) {
            // Key exists
            let currentCount = result[keyClicks];

            if (change) {
                currentCount += 1;
                // Store the updated value back in local storage
                chrome.storage.local.set({ [keyClicks]: currentCount }, () => {
                    console.log(`Updated noClicks`);
                });
            } else {
                console.log(`${keyClicks} exists: ${currentCount}`);
            }
        } else {
            // Key does not exist
            // Initialize and set the key with value 1
            chrome.storage.local.set({ [keyClicks]: 1 }, () => {
                console.log(`Initialized noClicks: 1`);
            });
        }
    });
}

// Function to clear local storage data for a specific tab
async function clearDataForTab(tabId) {
    // Define the key pattern for the tab
    const keyPattern = `tab_${tabId}`;

    // Retrieve all keys
    chrome.storage.local.get(null, (items) => {
        if (chrome.runtime.lastError) {
            console.error(`Error retrieving storage items: ${chrome.runtime.lastError}`);
            return;
        }

        // Filter keys that match the tab pattern
        const keysToRemove = Object.keys(items).filter(key => key.startsWith(keyPattern));

        // Remove all matching keys
        if (keysToRemove.length > 0) {
            chrome.storage.local.remove(keysToRemove, () => {
                if (chrome.runtime.lastError) {
                    console.error(`Error removing data for tab ${tabId}: ${chrome.runtime.lastError}`);
                } else {
                    console.log(`Data cleared for tab ${tabId}.`);
                }
            });
        } else {
            console.log(`No data found for tab ${tabId}.`);
        }
    });
}  
// Example: Clear local storage when the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
    clearLocalStorage();
});
  
// Function to send a message and wait for a specific response
function sendMessageAndWait(tabId, messageType, expectedStatus) {
    return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, { type: messageType }, (response) => {
            // console.log("sendMessageAndWait",response.status);
            if (chrome.runtime.lastError) {
                reject(new Error(`Failed to send message to tab ${tabId}: ${chrome.runtime.lastError.message}`));
            } else if (response && response.status === expectedStatus) {
                resolve();
            } else {
                reject(new Error(`Unexpected response status. Expected: ${expectedStatus}, but got: ${response ? response.status : 'no response'}`));
            }
        });

        setTimeout(() => {
            reject(new Error(`Timeout waiting for ${expectedStatus} from tab ${tabId}`));
        }, 5000); // Adjust timeout as needed
    });
}

// Function to dynamically inject missing scripts
function injectMissingScripts(tabId, missingScripts) {
    return Promise.all(missingScripts.map(scriptName => {
        return new Promise((resolve, reject) => {
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ["./injectScripts/"+scriptName]
            }, () => {
                if (chrome.runtime.lastError) {
                    reject(new Error(`Failed to inject script ${scriptName} into tab ${tabId}: ${chrome.runtime.lastError.message}`));
                } else {
                    console.log(`Injected ${scriptName} successfully.`);
                    resolve();
                }
            });
        });
    }));
}
// Function to check if a dubugger instance is attached to a tab
async function isDebuggerAttached(tabId) {
    chrome.debugger.getTargets((targets) => {
        let attached = false;
        for (const target of targets) {
            if (target.tabId === tabId && target.attached) {
                attached = true;
                break;
            }
        }
        return (attached);
    });
}