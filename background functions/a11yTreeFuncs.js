export async function getFullAXTree(tabId,frameId) {
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

export async function fullA11yTreeFilter(tabId,fullA11yTree) {
    const backEndIdWithName = {};
    console.log("fullA11yTreeFilter", fullA11yTree);
    const listOfRolesThatWillBeSeen = ["button"]
    let count = 0
    for (const obj of fullA11yTree) {
        /* 
            Switch to this if want to swtich back to only noticing stuff thats would not automatically be detected
            (obj.name.value !== "" || listOfRolesThatWillBeSeen.includes(obj.role.value))
            obj.role.value !== "RootWebArea") not an element we can add an attribute 
        */
        if ((obj.name && obj.name.value !== "" && obj.name.value !== "uninteresting"  && obj.role.value !== "RootWebArea")) {
            if (obj.role.value === "StaticText"  && obj.parentId !== "")
            {
                obj.backendDOMNodeId = parseInt(obj.parentId);
                let parentNode;
                try 
                {
                    parentNode= (await queryAXTreeByBackendNodeId(tabId,obj.backendDOMNodeId)).nodes;
                    console.log("fullA11yTreeFilter update to the parentIds",obj.backendDOMNodeId);
                    console.log("fullA11yTreeFilter parentNode",parentNode)
                    if (parentNode.length > 0)
                    {
                        obj.parentId = parseInt(parentNode[0].parentId);
                        console.log("The change",obj.parentId);
                    }

                }
                catch(e)
                {
                    console.log(`Error queryAXTreeByBackendNodeId the id ${tabId,obj.backendDOMNodeId}`,e);
                }
               
            }
            let name = ""
            if (obj.name !== undefined)
            {
                name = obj.name.value
            }

            backEndIdWithName[obj.backendDOMNodeId] = 
            {
                value:`${name} ${count}`,
                parentId: parseInt(obj.parentId)
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
