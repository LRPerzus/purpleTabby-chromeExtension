chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.type === "GET_AX_TREE") {
        console.log("Message received in background script:", request);
        try {
            const tabId = request.tabId;

            await attachDebugger(tabId);
            await enableAccessibility(tabId);
            const rootNode = await getRootAXNode(tabId);
            const { filteredTree, backendDOMNodeIds } = await fetchAndFilterAccessibilityTree(tabId, rootNode.node);

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
        console.log("Processing Node:", node);

        if (!node.childIds || node.childIds.length === 0) {
            if (node.name && node.name.value && node.name.value.trim() !== "") {
                console.log("Adding backendDOMNodeId:", node.backendDOMNodeId);
                backendDOMNodeIds.push(node.backendDOMNodeId);
            }
            return node;
        }

        node.children = [];
        for (const childId of node.childIds) {
            const childNode = await new Promise((resolve, reject) => {
                chrome.debugger.sendCommand({ tabId }, "Accessibility.getChildAXNodes", { id: childId }, (childResult) => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve(childResult.nodes[0]);
                    }
                });
            });

            if (childNode) {
                const filteredChildNode = await processNode(childNode);
                if (filteredChildNode) {
                    node.children.push(filteredChildNode);
                }
            }
        }

        if (node.name && node.name.value && node.name.value.trim() !== "") {
            console.log("Adding backendDOMNodeId:", node.backendDOMNodeId);
            backendDOMNodeIds.push(node.backendDOMNodeId);
        }

        return node;
    }

    const filteredTree = await processNode(node);
    return { filteredTree, backendDOMNodeIds };
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