import {getFullAXTree,fullA11yTreeFilter} from "./a11yTreeFuncs.js"
import {setAttributeValue} from "./common.js"

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
                resolve(frameIds);
            }
        });
    });
}


export async function processFrameTrees(tabId, frameTree) {
    const allFrameNamesDict = {};

    const promises = frameTree.map(async frameId => {
        const fullA11yTree = await getFullAXTree(tabId, frameId);
        console.log("WHOLE A11y TREE", fullA11yTree);

        // Collecting only the DOM ids with names
        const onlyNames = await fullA11yTreeFilter(tabId, fullA11yTree.nodes);
        console.log("Filtered tree A11y Whole:", onlyNames);

        // Iterate over the object and stack values like a dictionary
        for (const key in onlyNames) {
            if (onlyNames.hasOwnProperty(key)) {
                allFrameNamesDict[key] = onlyNames[key].value;
            }
        }
    });

    // Wait for all the promises to resolve
    await Promise.all(promises);
    console.log("All frames processed.");
    return allFrameNamesDict;
}

export async function settingAttributeNode(tabId, backendDOMNodeIds, domDictionary) {
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
