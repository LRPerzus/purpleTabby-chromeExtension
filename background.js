chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.type === "GET_AX_TREE") {
        console.log("Message received in background script:", request);
        try {
            const tabId = request.tabId;

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

            // Prepare data for download
            const data = {
                tree: filteredTree,
                backendDOMNodeIds: backendDOMNodeIds
            };
            const json = JSON.stringify(data, null, 2);

            // Send the data to the content script or popup
            chrome.runtime.sendMessage({
                type: "DOWNLOAD_AX_TREE",
                data: json
            });
        } catch (error) {
            console.error("Error processing AX Tree:", error, JSON.stringify(error));
        } finally {
            try {
                const tabId = request.tabId;
                await detachDebugger(tabId);
            } catch (error) {
                console.error("Error detaching debugger:", error, JSON.stringify(error));
            }
        }
    }
});




let debuggerAttached = {};

async function attachDebugger(tabId) {
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

        // Handle leaf nodes
        if (!node.childIds || node.childIds.length === 0) {
            if (node.name && node.name.value && node.name.value.trim() !== "") {
                console.log("Adding backendDOMNodeId:", node.backendDOMNodeId);
                backendDOMNodeIds.push(node.backendDOMNodeId);
            }
            return node;
        }
        console.log("node.backendDOMNodeId",node.childIds[0])

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
        const childreNodesDictionary = childNodes.reduce((acc, curr) => {
            if (curr.nodeId) {
                acc[curr.nodeId] = curr;
            }
            return acc;
        }, {});
        
        console.log("nodesDictionary", childreNodesDictionary);
        

        const children = [];
        for (const childId of node.childIds)
        {
            console.log(`Fetching child node with ID: ${childId}`);

            // You need to find the childNode cause the function is very weird
            const foundChildNode = childreNodesDictionary[childId];
            if (foundChildNode !== undefined)
            {
                console.log(`Fetched child node with ID: ${childId}`);
                const filteredChildNode = await processNode(foundChildNode);
                if (filteredChildNode) {
                    children.push(filteredChildNode);
                }
            }

        }
        return { ...node, children };
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