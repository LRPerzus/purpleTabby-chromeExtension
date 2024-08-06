import { addXPath } from "./functions/addXpath.js";
import { pruneEmptyNodes } from "./functions/pruneEmptyNodes.js";

// Function to store data for a specific tab
function storeDataForTab(tabId, data, type, noClicked = null) {
    // Create a key specific to the tab
    let key

    if ( noClicked === null)
    {
        key = `tab_${tabId}_${type}`;
    }
    else
    {
        key = `tab_${tabId}_${type}_${noClicked}`;
    }

    // Store data in chrome.storage.local
    chrome.storage.local.set({ [key]: data }, () => {
        if (chrome.runtime.lastError) {
            console.error(`Error storing data for tab ${tabId}: ${chrome.runtime.lastError}`);
        } else {
            console.log(`Data stored for tab ${tabId}.`);
        }
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



// Function to clear local storage
// Function to clear data for a specific tab
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

function clearLocalStorage() {
    chrome.storage.local.clear(() => {
      if (chrome.runtime.lastError) {
        console.error(`Error clearing local storage: ${chrome.runtime.lastError}`);
      } else {
        console.log("Local storage cleared successfully.");
      }
    });
  }
  
// Example: Clear local storage when the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
    clearLocalStorage();
});
  

function waitForMessage(tabId, messageType) {
    return new Promise((resolve, reject) => {
        function onMessage(request, sender, sendResponse) {
            if (sender.tab.id === tabId && request.type === messageType) {
                chrome.runtime.onMessage.removeListener(onMessage); // Clean up listener
                resolve();
            }
        }
        chrome.runtime.onMessage.addListener(onMessage);
    });
}
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

async function getFromLocal(tabId, key, noclicks = false) {
    // Create a key specific to the tab
    let tabKey
    if (noclicks !== false)
    {
        tabKey =  `tab_${tabId}_${key}_${noclicks}`
    }
    else 
    {
        tabKey = `tab_${tabId}_${key}`;
    }

    return new Promise((resolve, reject) => {
        chrome.storage.local.get([tabKey], function(result) {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(result[tabKey]);
            }
        });
    });
}


async function areScansFinished(tabId)
{
    let A11yTree = null; 
    let clickAbleElements = null;
    const currentClick = await getFromLocal(tabId,"noClicks")
    console.log("currentClick",currentClick);
    if (firstClick[tabId] === false)
    {
        console.log("HEY I Already clicked once")
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
    else {
         // For A11y Tree
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
    
}

let firstClick = {};

chrome.action.onClicked.addListener(async (tab) => {

    console.log("When plugin is clicked debugger is:",await isDebuggerAttached(tab.id))
    console.log("firstClick",firstClick)

    if (!(tab.id in firstClick))
    {
        console.log("This is the first click");
        firstClick[tab.id] = true;
        await clearDataForTab(tab.id);

        // attaches the number of clicks
        await updateNoClicksTabID(tab.id);

        // A11y Tree Listeners
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['./a11yTreeListeners.js']
        });
        //Get Clickable Listners
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['./getClickableElementsListeners.js']
        }); 
        
        // overlay Listeners
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['./overlayListeners.js']
        }); 


        // Wait for both scripts to signal readiness
        Promise.all([
            waitForMessage(tab.id, "A11Y_LISTENERS_READY"),
            waitForMessage(tab.id, "GET_CLICKABLE_READY")
        ]).then(() => {
            console.log("Both scripts are ready. Proceeding with further actions.");
            // Proceed with additional actions
            // Set the overlay
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['./overlay.js']
            });

        }).catch(error => {
            console.error("Error waiting for scripts to be ready:", error);
        });
    }
    else
    {
        console.log("ReOpen after closing");
        firstClick[tab.id] = false
        
        // updates
        await updateNoClicksTabID(tab.id,true);

        // Set the overlay
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['./overlay.js']
        });
    }
   
});

let onOFF = false

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.type === "ON_OFF")
    {
        onOFF = request.on;
        const id = sender.tab.id;
        console.log("onOFF",onOFF);
        console.log("tabid",id)
        console.log("Before I even attach the debugger",await isDebuggerAttached(id))
    }
    else if (request.type === "HIGHLIGHT_MISSING")
    {
        console.log("HIGHLIGHT_MISSING Received")
        const missingXpath = await getFromLocal(sender.tab.id,"missingXpath");
        console.log(" HIGHLIGHT_MISSING missingXpath",missingXpath)
        let data;
        const id = sender.tab.id;
        if (missingXpath !== undefined)
        {
            console.log("OH LOOK NOT UNDEFINED")
            data = missingXpath;
        }
        else{
            data = "undefined"
        }
        chrome.tabs.sendMessage(id, { type: "HIGHLIGHT", data:data });
        
    }
    else if (request.type === "OVERLAY_CREATED") {
        console.log("Overlay created, preparing to request AX tree.");

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].id) {
                const tabId = tabs[0].id;
                console.log("Sending Can get messages to tabId:", tabId);
                chrome.tabs.sendMessage(tabId, { type: "Can_Get_Tree", tabId: tabId });
                chrome.tabs.sendMessage(tabId, { type: "Can_find_clickable", tabId: tabId });

            } else {
                console.error("Unable to get the active tab.");
            }
        });
    }
    else if (request.type === "GET_AX_TREE") {
        console.log("Message received in background script:", request);
        try {
            const tabId = request.tabId;
            console.log("When GET_AX_TREE is triggered debugger is:",isDebuggerAttached(tabId));

            let debuggerAttached = false;
            if (await isDebuggerAttached(request.tabId) === undefined || !debuggerAttached[tabId] && debuggerAttached[tabId] === false)
            {
                await attachDebugger(tabId);
                debuggerAttached = true;
            }
            await enableAccessibility(tabId);
            const rootNode = await getRootAXNode(tabId);
            console.log("rootNode",rootNode.node)
            const {filteredTree} = await fetchAndFilterAccessibilityTree(tabId, rootNode.node);

            // const results = await Promise.all(
            //     backendDOMNodeIds.map(async (backendDOMNodeId) => {
            //         console.log("Looking at backendDOMNodeId", backendDOMNodeId);
            //         const result = await resolveNodeById(tabId, backendDOMNodeId);
            //         return { backendDOMNodeId, result };
            //     })
            // );

            console.log("Filtered Tree:", filteredTree);
            // console.log("Backend DOM Node IDs:", backendDOMNodeIds);
            // console.log("Results:", results);

            // Modify the results
            const notEmptyNames = [];
            const allPaths = [];
            // await pruneEmptyNodes(filteredTree);
            await addXPath(filteredTree, "", notEmptyNames,true,allPaths);
            console.log("notEmptyNames",notEmptyNames);

            // Find the Xpaths in the DOM
            const data = {
                tabId:tabId,
                notEmptyNames:notEmptyNames
            }
            if (debuggerAttached)
            {
                await detachDebugger(tabId);
            }
            // Send the data to the content script or popup
            chrome.tabs.sendMessage(tabId,{
                type: "DOWNLOAD_AX_TREE",
                data: {filteredTree:filteredTree}
            });

            chrome.tabs.sendMessage(tabId, { type: "A11yTree_DOM_XPATHS", data: data }); 
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
         // Prepare data for download
         const data = {
            foundElement:foundElement
        };
        const json = JSON.stringify(data, null, 2);

        await areScansFinished(tabId);


        // Send the data to the content script or popup
        chrome.tabs.sendMessage(tabId,{
            type: "DOWNLOAD_Name_A11yTree",
            data: json
        });
        
    }
    else if (request.type === "clickableElements_XPATHS_DONE")
    {
        const noClicks = await getFromLocal(request.tabId,"noClicks")

        storeDataForTab(request.tabId,request.clickableElements,"clickableElements",noClicks)
        chrome.tabs.sendMessage(request.tabId,{ type: "clickable_stored" });

        
        const inStorage = await getFromLocal(request.tabId,"clickableElements",noClicks)
        console.log("inStorage clickableElements",inStorage);

        await areScansFinished(request.tabId);

    }

    else if (request.type === "MISSING_FOUND")
    {
        storeDataForTab(request.data.tabId,request.data.missing,"missingXpath");
        const tabId = request.data.tabId;
         // Send the data to the content script or popup
         chrome.tabs.sendMessage(tabId,{
            type: "UPDATE_OVERLAY",
            data: request.data
        });
    }
});

let debuggerAttached = {};

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

async function getRootAXNode(tabId) {
    return new Promise((resolve, reject) => {
        chrome.debugger.sendCommand({ tabId }, "Accessibility.getRootAXNode", {}, (result) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(result);
            }
        });
    });
}

async function fetchAndFilterAccessibilityTree(tabId, node) {
    let backendDOMNodeIds = [];

    async function processNode(node) {
        if (!node) {
            console.error("Node is null or undefined");
            return null;
        }
        console.log("Processing node:",node.nodeId)
        console.log(node)

        // Create a new JS object with nodeId, role, and name
        const nodeObject = {
            nodeId: node.nodeId,
            role: (node.role && node.role.value && node.role.value.trim() !== "") ? node.role.value : "",
            name: (node.name && node.name.value && node.name.value.trim() !== "") ? node.name.value : ""
        };

        // Process child nodes if they exist
        if (node.childIds && node.childIds.length > 0) {
            const childNodes = await new Promise((resolve, reject) => {
                chrome.debugger.sendCommand({ tabId }, "Accessibility.getChildAXNodes", { id: node.nodeId }, (childResult) => {
                    if (chrome.runtime.lastError) {
                        console.error("Error fetching child node:", chrome.runtime.lastError);
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve(childResult.nodes || []);
                    }
                });
            });

            nodeObject.children = [];
            for (const childId of node.childIds) {
                const foundChildNode = childNodes.find(child => child.nodeId === childId);
                if (foundChildNode) {
                    const processedChild = await processNode(foundChildNode);
                    if (processedChild) {
                        nodeObject.children.push(processedChild);
                    }
                }
            }
        }

        // Collect backendDOMNodeIds for nodes with names
        if (node.name && node.name.value && node.name.value.trim() !== "") {
            backendDOMNodeIds.push(node.backendDOMNodeId);
        }

        return nodeObject;
    }

    try {
        const filteredTree = await processNode(node);
        return { filteredTree, backendDOMNodeIds };
    } catch (error) {
        console.error("Error processing tree:", error);
        return { filteredTree: null, backendDOMNodeIds };
    }
}


// Function to get the accessibility tree
// Do not use this is bad not good :(
function getAccessibilityTree(tabId) {
    return new Promise((resolve, reject) => {
      chrome.debugger.sendCommand({ tabId: tabId }, 'Accessibility.getFullAXTree', {}, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(`Command failed: ${chrome.runtime.lastError.message}`));
        } else {
          resolve(result);
        }
      });
    });
  }