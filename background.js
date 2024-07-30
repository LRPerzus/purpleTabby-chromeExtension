import { addXPath } from "./functions/addXpath.js";

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

chrome.action.onClicked.addListener((tab) => {
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
});

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.type === "OVERLAY_CREATED") {
        console.log("Overlay created, preparing to request AX tree.");

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].id) {
                const tabId = tabs[0].id;
                console.log("Sending GET_AX_TREE message with tabId:", tabId);
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
            console.log("TabID IN BACKGROUND",tabId)

            await attachDebugger(tabId);
            await enableAccessibility(tabId);
            const rootNode = await getRootAXNode(tabId);
            const { filteredTree, backendDOMNodeIds} = await fetchAndFilterAccessibilityTree(tabId, rootNode.node);

            const results = await Promise.all(
                backendDOMNodeIds.map(async (backendDOMNodeId) => {
                    console.log("Looking at backendDOMNodeId", backendDOMNodeId);
                    const result = await resolveNodeById(tabId, backendDOMNodeId);
                    return { backendDOMNodeId, result };
                })
            );

            console.log("Filtered Tree:", filteredTree);
            console.log("Backend DOM Node IDs:", backendDOMNodeIds);
            console.log("Results:", results);

            // Modify the results
            const notEmptyNames = [];
            const allPaths = [];
            addXPath(filteredTree, "", notEmptyNames,true,allPaths);

            // Prepare data for download
            const data = {
                tree: filteredTree,
                notEmptyNamesXapths: notEmptyNames
            };
            const json = JSON.stringify(data, null, 2);

            // Send the data to the content script or popup
            // chrome.runtime.sendMessage({
            //     type: "DOWNLOAD_AX_TREE",
            //     data: json
            // });
            await detachDebugger(tabId);

            chrome.tabs.sendMessage(tabId, { type: "AX_TREE", data: data }); 
            // Use chrome tab cause runtime is not the same
            // Tabs are used to send back to another script 


        } catch (error) {
            console.error("Error processing AX Tree:", error, JSON.stringify(error));
        }
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

        console.log("Processing Node:", node);

        // Default values for name and role
        const nameValue = (node.name && node.name.value && node.name.value.trim() !== "") ? node.name.value : "";
        const roleValue = (node.role && node.role.value && node.role.value.trim() !== "") ? node.role.value : "";

        // Handle leaf nodes
        if (!node.childIds || node.childIds.length === 0) {
            if (nameValue !== "") {
                console.log("Adding backendDOMNodeId:", node.backendDOMNodeId);
                backendDOMNodeIds.push(node.backendDOMNodeId);
            }
            return {
                nodeId: node.nodeId,
                name: nameValue,
                role: roleValue
            };
        }

        // Process child nodes
        const childNodes = await new Promise((resolve, reject) => {
            chrome.debugger.sendCommand({ tabId }, "Accessibility.getChildAXNodes", { id: node.nodeId }, (childResult) => {
                if (chrome.runtime.lastError) {
                    console.error("Error fetching child node:", chrome.runtime.lastError);
                    reject(chrome.runtime.lastError);
                } else {
                    if (childResult.nodes && childResult.nodes.length > 0) {
                        resolve(childResult.nodes);
                    } else {
                        console.warn(`No nodes returned for ID: ${node.nodeId}`);
                        resolve([]);
                    }
                }
            });
        });
        
        // Convert the array of nodes to a dictionary where the key is nodeId
        const childNodesDictionary = childNodes.reduce((acc, curr) => {
            if (curr.nodeId) {
                acc[curr.nodeId] = curr;
            }
            return acc;
        }, {});
        
        console.log("nodesDictionary", childNodesDictionary);
        
        const children = [];
        for (const childId of node.childIds) {
            console.log(`Fetching child node with ID: ${childId}`);

            const foundChildNode = childNodesDictionary[childId];
            if (foundChildNode !== undefined) {
                console.log(`Fetched child node with ID: ${childId}`);
                const filteredChildNode = await processNode(foundChildNode);
                if (filteredChildNode) {
                    children.push(filteredChildNode);
                }
            }
        }

        return {
            nodeId: node.nodeId,
            name: nameValue,
            role: roleValue,
            children
        };
    }

    try {
        const filteredTree = await processNode(node);
        return { filteredTree, backendDOMNodeIds };
    } catch (error) {
        console.error("Error processing tree:", error);
        return { filteredTree: null, backendDOMNodeIds };
    }
}

async function resolveNodeById(tabId, backendDOMNodeId) {
    return new Promise((resolve, reject) => {
        chrome.debugger.sendCommand({ tabId }, "DOM.resolveNode", {
            backendNodeId: backendDOMNodeId
        }, (result) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                console.log("Resolved Node Result:", result);
                resolve(result); // Return the result
            }
        });
    });
}