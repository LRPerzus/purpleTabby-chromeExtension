import {getFullAXTree,fullA11yTreeFilter} from "./a11yTreeFuncs.js"
import {setAttributeValue,doubleCheckNodeId} from "./common.js"

/*
    To get the FrameIds of a page entirely 
*/
export async function getFrameTree(tabId) {
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
                console.log("getFrameTree DONE");
                resolve(frameIds);
            }
        });
    });
}


export async function processFrameTrees(tabId, frameTree) {
    console.log("processFrameTrees start");
    const allFrameNamesDict = {};

    const promises = frameTree.map(async frameId => {
        console.log("Processing frame ID:", frameId);
        const fullA11yTree = await getFullAXTree(tabId, frameId);
        console.log("WHOLE A11y TREE", fullA11yTree);

        const onlyNames = await fullA11yTreeFilter(tabId, fullA11yTree.nodes);
        console.log("Filtered tree A11y Whole:", onlyNames);

        for (const key in onlyNames) {
            if (onlyNames.hasOwnProperty(key)) {
                allFrameNamesDict[key] = onlyNames[key].value;
            }
        }
    });

    await Promise.all(promises).catch(error => {
        console.error("Error processing frame trees:", error);
    });

    console.log("All frames processed.");
    return allFrameNamesDict;
}


export async function settingAttributeNode(tabId, backendDOMNodeIds, domDictionary) {
    // Create an array of promises for setting attributes
    let correspondingNodeId;
    let bId;
    const promises = Object.keys(backendDOMNodeIds).map(async backendId => {
        try {
            
            // console.log("settingAttributeNode", backendId);
            bId = backendId;
            correspondingNodeId = domDictionary[backendId];
            // console.log("correspondingNodeId backendId", correspondingNodeId);

            // Not found in the DOM TRY using the parentId cause sometimes A11yTree might get ::before nodes
            if (correspondingNodeId) {
                // console.log("OK GOOD NO ISSUE",backendId)
            } else {
                console.log("settingAttributeNode Erm it does not exists domDictionary:",backendId);
                const parentOfBackendId = backendDOMNodeIds[backendId].parentId;
                correspondingNodeId = domDictionary[parentOfBackendId];
            }
            const attribute = await setAttributeValue(tabId, correspondingNodeId,"purple_tabby_a11ytree");
            console.log("attribute?",attribute)
            if (attribute !== true && attribute === "redo")
            {
                // console.log("redooooing",backendId)
                const tryAgainBId = parseInt(backendId);
                const tryAgain = await doubleCheckNodeId(tabId,tryAgainBId);
                // console.log("tryAgain",backendId,tryAgain);
                if (tryAgain.nodeName !== "::before" && tryAgain.nodeName !== "::after" && correspondingNodeId !== tryAgain.nodeId)
                {
                    // console.log("new nodeId",tryAgain.nodeId);
                    domDictionary[backendId] = tryAgain.nodeId;
                    const attribute = await setAttributeValue(tabId, tryAgain.nodeId,"purple_tabby_a11ytree");
                }
            }
            // console.log("set attribute?",backendId, attribute);

        } catch (error) {
            console.log(`settingAttributeNode Error: ${error}`,backendId);
        }
    });

    // Wait for all promises to complete
    await Promise.allSettled(promises);
}
