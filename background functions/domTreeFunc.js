import {resolveNode,getEventListeners} from "./eventListnerTree.js"
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

export async function collectDOMNodes(tabId) {
    const nodeMap = {}; // Dictionary to store backendNodeId and nodeId pairs
    const resolveNodes = {}
    const eventListnersList ={};

    async function traverseNode(node) {
        try{
            // Add backendNodeId and nodeId to the dictionary
            if (node.backendNodeId) {
                // console.log("Adding to the dict",node.backendNodeId)
                // console.log(`Adding to the dict ${node.backendNodeId} ${node.nodeId} `)
                nodeMap[node.backendNodeId] = node.nodeId;
                const {jsRuntimeObj,change} = await resolveNode(tabId,node.nodeId,node.backendNodeId);
                // console.log("Outer jsRuntimeObj",jsRuntimeObj);
                if (change){
                    resolveNodes[node.backendNodeId] = change;
                    // console.log("getEventListeners change",change);
                }
                if (jsRuntimeObj)
                {
                    const jsRuntimeObjId = jsRuntimeObj.objectId;
                    resolveNodes[node.backendNodeId] = jsRuntimeObjId;
                    if (jsRuntimeObjId)
                    {
                        const eventListners = await getEventListeners(tabId,jsRuntimeObjId)
                        if (eventListners.length > 0 && node.nodeName !== "#document")
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
                // console.log("traverseNode shadowRoot exsists")
                for (const child of node.shadowRoots) {
                    await traverseNode(child);
                }
            } else {
                // console.warn("No shadowRoot is not an array:", node);
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

    console.log("collectDOMNodes complete");
    return {nodeMap:nodeMap, resolveNodes:resolveNodes,eventListnersList:eventListnersList};
}