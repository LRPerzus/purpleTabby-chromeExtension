// Set Variables
let firstClick = {};
let onOFF = false
let debuggerAttached = {};

// --- Plugin Icon on the top click functions
chrome.action.onClicked.addListener(async (tab) => {

    console.log("When plugin is clicked debugger is:",await isDebuggerAttached(tab.id))

    console.log("firstClick",firstClick)

    // The first click is to ensure the scritpts are injected into the page each time the get click on first
    if (!(tab.id in firstClick) || firstClick[tab.id] !== tab.url)
    {
        // console.log("This is the first click");
        firstClick[tab.id] = tab.url;
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
        firstClick[tab.id] = tab.url;
        
        // updates the number
        await updateNoClicksTabID(tab.id,true);

        // Set the overlay
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['./overlay.js']
        });
    }
   
});

// --- Event Listeners
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.type === "HIGHLIGHT_MISSING")
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
    else if (request.type === "RESCAN_INNIT")
    {
        console.log("Rescanning");
        firstClick[sender.tab.id] = sender.tab.url;
        
        // updates the number
        await updateNoClicksTabID(sender.tab.id,true);
        chrome.tabs.sendMessage(sender.tab.id, { type: "START_RESCANNING" , tabId:sender.tab.id});
    }
    else if (request.type === "OVERLAY_CREATED") {
        console.log("Overlay created, preparing to request AX tree and clickableElements.");

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
        // console.log("Message received in background script:", request);
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
            await enableDOMDomain(tabId)

            // Full DOM DICT TREE
            const { nodeMap, resolveNodes, eventListnersList } = await collectDOMNodes(tabId);
            const domDictionary = nodeMap; 
            console.log("domDictionary",domDictionary); 
            console.log("resolveNodes",resolveNodes);
            console.log("eventListnersList",eventListnersList)

            // Set Attribute tabby-has-listener = "true"
            await addAttributeEventList(tabId,domDictionary,eventListnersList)


            // const firstKey = Object.keys(domDictionary)[0];
            // const nodeId = await resolveNode(tabId,domDictionary[firstKey]);
            // console.log("resolveNode_nodeId",nodeId.objectId);
            // if (nodeId)
            // {
            //     const eventList = await getFullEventListeners(tabId,nodeId.objectId);
            //     console.log("eventList",eventList);
            // }



            // Frames inside a page
            const frameTree = await getFrameTree(tabId);
            console.log("FrameTree",frameTree);

            // Read each Frame
            await processFrameTrees(tabId,frameTree,domDictionary);
           
            // Find the Xpaths in the DOM
            const data = {
                tabId:tabId,
            }
            if (debuggerAttached)
            {   
                console.log("Dettaching")
                await detachDebugger(tabId);
            }

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

    else if (request.type === "A11YFIXES_INNIT")
    {
        const tabId = sender.tab.id;
        const missingXpaths = await getFromLocal(tabId,"missingXpath");

        console.log("A11YFIXES_INNIT missingXpaths:",missingXpaths);
        chrome.tabs.sendMessage(tabId,{ type: "A11YFIXES_Start", missingXpaths:missingXpaths});

    }
    else if (request.type === "ERROR_REFRESHNEED")
    {
        console.log("ERROR_REFRESHNEED");
        const tabId = sender.tab.id;
        firstClick[tabId] = "ERROR";
    }
});

// -- Functions
async function processFrameTrees(tabId, frameTree,domDictionary) {
    const promises = frameTree.map(async frameId => {
        const fullA11yTree = await getFullAXTree(tabId, frameId);
        console.log("WHOLE A11y TREE", fullA11yTree);

        // Collecting only the DOM ids with names
        const onlyNames = await fullA11yTreeFilter(tabId, fullA11yTree.nodes);
        console.log("Filtered tree A11y Whole:", onlyNames);

        // Setting attributes on nodes
        await settingAttributeNode(tabId, onlyNames, domDictionary);
    });

    // Wait for all the promises to resolve
    await Promise.all(promises);
    console.log("All frames processed.");
}
/*
    To get the FrameIds of a page entirely 
*/
async function getFrameTree(tabId) {
    return new Promise((resolve, reject) => {
        chrome.debugger.sendCommand({ tabId }, 'Page.getFrameTree', {}, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError));
            } else {
                const frameIds = [];
                const collectFrameIds = (frameTree) => {
                    frameIds.push(frameTree.frame.id);
                    if (frameTree.childFrames) {
                        for (const child of frameTree.childFrames) {
                            collectFrameIds(child);
                        }
                    }
                };
                collectFrameIds(response.frameTree);
                resolve(frameIds);
            }
        });
    });
}

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
async function setAttributeValue(tabId, nodeId,name) {
    const value = "true";

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
    Function to Enable the DOM domain 
*/
async function getDOMDocument(tabId) {
    return new Promise((resolve, reject) => {
        chrome.debugger.sendCommand({ tabId }, 'DOM.getDocument', {depth:-1, pierce:true}, (result) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            resolve(result);
        });
    });
}

async function resolveNode(tabId, nodeId) {
    return new Promise((resolve, reject) => {
        chrome.debugger.sendCommand({ tabId }, 'DOM.resolveNode', { nodeId }, (result) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            if (result && result.object) {
                resolve(result.object);
            } else {
                reject(new Error('Failed to resolve node to object.'));
            }
        });
    });
}

async function getFullEventListeners(tabId, objectId) {
    return new Promise((resolve, reject) => {
        chrome.debugger.sendCommand({ tabId }, 'DOMDebugger.getEventListeners', { objectId:objectId, depth:-1 ,pierce:true}, (result) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            if (result && result.listeners) {
                resolve(result.listeners);
            } else {
                reject(new Error('Failed to retrieve event listeners.'));
            }
        });
    });
}

async function getEventListeners(tabId, objectId) {
    return new Promise((resolve, reject) => {
        chrome.debugger.sendCommand({ tabId }, 'DOMDebugger.getEventListeners', { objectId:objectId}, (result) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            if (result && result.listeners) {
                resolve(result.listeners);
            } else {
                reject(new Error('Failed to retrieve event listeners.'));
            }
        });
    });
}

async function collectDOMNodes(tabId) {
    const nodeMap = {}; // Dictionary to store backendNodeId and nodeId pairs
    const resolveNodes = {}
    const eventListnersList ={};

    async function traverseNode(node) {
        try{
            // Add backendNodeId and nodeId to the dictionary
            if (node.backendNodeId) {
                console.log("Adding to the dict",node.backendNodeId)
                nodeMap[node.backendNodeId] = node.nodeId;
                const jsRuntimeObj = await resolveNode(tabId,node.nodeId);
                if (jsRuntimeObj)
                {
                    const jsRuntimeObjId = jsRuntimeObj.objectId;
                    resolveNodes[node.backendNodeId] = jsRuntimeObjId;
                    if (jsRuntimeObjId)
                    {
                        const eventListners = await getEventListeners(tabId,jsRuntimeObjId)
                        if (eventListners.length > 0)
                        {
                            eventListners.forEach(event => {
                                if (event.type === "click")
                                {
                                    eventListnersList[node.backendNodeId] = eventListners;
                                }
                            });
                        }
                       
                    }
                }


            }

            if (Array.isArray(node.shadowRoots))
            {
                console.log("traverseNode shadowRoot exsists")
                for (const child of node.shadowRoots) {
                    await traverseNode(child);
                }
            } else {
                console.warn("No shadowRoot is not an array:", node);
            }

            // Process children recursively
            if (node.children && node.children.length > 0) {
                for (const child of node.children) {
                    await traverseNode(child);
                }
            } else if (node.frameId && node.contentDocument)// For frames and Iframes ETC
            {
                if(Array.isArray(node.contentDocument.children) && node.contentDocument.children.length >0)
                {
                    for (const child of node.contentDocument.children) {
                        await traverseNode(child);
                    }
                }
            }
        }
        catch (error){
            console.error("Error traverseNode:", error);

        }
        
    }

    // Start traversal from the root node
    try {
        const document = await getDOMDocument(tabId);
        console.log("Whole Tree",document);
        await traverseNode(document.root);
    } catch (error) {
        console.error("Error collecting DOM nodes:", error);
    }

    return {nodeMap:nodeMap, resolveNodes:resolveNodes,eventListnersList:eventListnersList};
}

async function settingAttributeNode(tabId, backendDOMNodeIds, domDictionary) {
    // Create an array of promises for setting attributes
    const promises = Object.keys(backendDOMNodeIds).map(async backendId => {
        try {
            console.log("settingAttributeNode", backendId);
            let correspondingNodeId = domDictionary[backendId];
            console.log("correspondingNodeId", correspondingNodeId);

            // Not found in the DOM TRY using the parentId cause sometimes A11yTree might get ::before nodes
            if (correspondingNodeId) {
                console.log("OK GOOD NO ISSUE")
            } else {
                console.log("settingAttributeNode Erm it does not exists domDictionary:",backendId);
                const parentOfBackendId = backendDOMNodeIds[backendId].parentId;
                correspondingNodeId = domDictionary[parentOfBackendId];
            }
            const attribute = await setAttributeValue(tabId, correspondingNodeId,"purple_tabby_a11yTree");
            console.log("set attribute?", attribute);

        } catch (error) {
            console.log(`settingAttributeNode Error: ${error}`);
        }
    });

    // Wait for all promises to complete
    await Promise.allSettled(promises);
}

async function getFullAXTree(tabId,frameId) {
    return new Promise((resolve, reject) => {
        chrome.debugger.sendCommand({ tabId }, 'Accessibility.getFullAXTree', {frameId:frameId}, (result) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                resolve(result);
            }
        });
    });
}

async function queryAXTreeByBackendNodeId(tabId, backendNodeId) {
    return new Promise((resolve, reject) => {
        const params = {
            backendNodeId // Only include backendNodeId in the parameters
        };

        chrome.debugger.sendCommand({ tabId }, 'Accessibility.queryAXTree', params, (result) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            resolve(result);
        });
    });
}

async function fullA11yTreeFilter(tabId,fullA11yTree) {
    const backEndIdWithName = {};
    console.log("fullA11yTreeFilter", fullA11yTree);
    const listOfRolesThatWillBeSeen = ["button"]
    let count = 0
    for (const obj of fullA11yTree) {
        /* 
            Switch to this if want to swtich back to only noticing stuff thats would not automatically be detected
            (obj.name.value !== "" || listOfRolesThatWillBeSeen.includes(obj.role.value))
        */
        if ((obj.name && obj.name.value !== "" && obj.name.value !== "uninteresting")) {
            if (obj.role && (obj.role.value === "StaticText" )&& obj.parentId !== "")
            {
                obj.backendDOMNodeId = parseInt(obj.parentId);
                const parentNode = (await queryAXTreeByBackendNodeId(tabId,obj.backendDOMNodeId)).nodes;
                // console.log("fullA11yTreeFilter update to the parentIds",obj.backendDOMNodeId);
                // console.log("fullA11yTreeFilter parentNode",parentNode)
                obj.parentId = parseInt(parentNode[0].parentId);
                console.log("The change",obj.parentId);
            }
            let name = ""
            if (obj.name !== undefined)
            {
                name = obj.name.value
            }

            backEndIdWithName[obj.backendDOMNodeId] = 
            {
                value:`${name} ${count}`,
                parentId: obj.parentId
            };
        }
        else
        {
            console.log("fullA11yTreeFilter cannot get xpath from element?")
        }
        count++;
    }

    return backEndIdWithName;
}

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
// Function to clear local storage for everything
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
  

// Function to wait for two messengers to be sent fully then it will allow for further continuation of the code;
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

/* 
    Function to get the data from local storage 
    Parameters:
        tabId : the tab id
        key: the type of storage you need i.e. clickableElements or A11yTree Elements
        noClicks: I added a possibility to store information on the number of clicks like which click is this
*/

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

/*
    Function that is used after each finished message for A11y Tree and get clickableElements to check if the scan is finished
    It checks if in the local storage stores both A11yTree and clickableElements.
*/
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
