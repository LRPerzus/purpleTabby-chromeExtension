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
            let id = parseInt(node.nodeId)
            if (id < 0)
            {
                id = parseInt(node.parentId)
            }
            console.log("Pushing to backendDOMNodeID:",id);
            if (!backendDOMNodeIds.includes(id))
            {
                backendDOMNodeIds.push(id);
            }
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