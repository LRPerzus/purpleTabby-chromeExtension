let pageListenerResult = "";
console.log("scanning process injected");

function containsATag(xpath) {
    // Regular expression to find any occurrence of an 'a' tag in the XPath string
    const regex = /\/a\[?\d*\]?\/(?!.*\/$)/i;
    return regex.test(xpath);
}

function containsButtonTag(xpath) {
    // Regular expression to find any occurrence of an 'a' tag in the XPath string
    const regex = /\/button\[?\d*\]?\/(?!.*\/$)/i;
    return regex.test(xpath);
}

function containsInputTag(xpath) {
    // Regular expression to find any occurrence of an 'a' tag in the XPath string
    const regex = /\/input\[?\d*\]?\/(?!.*\/$)/i;
    return regex.test(xpath);
}

function inList(a11yTree, xpath) {
    let condition = false;
    if (a11yTree.includes(xpath))
    {
        condition = true
    }

    // Too specific to one area cause we could have <a> <div> with a stop propigation
    // else if(containsATag(xpath) || containsButtonTag(xpath) || containsInputTag(xpath) )
    // {
    //     condition = true
    // }

    return condition;
}
  
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "SCAN_COMEPLETE")
    {
        console.log("SCAN_COMEPLETE HELLO?")
        const framesDict = {};
        const missing = [];

        const tab = message.data.tabId;
        const clickableElements = message.data.clickAbleElements;
        const A11yTree = message.data.A11yTree;
        console.log("YAY SCAN COMPLETE");
        console.log("SCAN_COMEPLETE clickableElements",clickableElements);
        console.log("SCAN_COMEPLETE A11yTree",A11yTree)

        // Checks if it's not in A11yTree and doesn't have children with the specific attribute
        clickableElements.forEach(element  => {
            try {
                const elementXpath = element.path;
                // console.log("elementXpath",elementXpath)
                let bodyNode = document.body;
                let parentResult = null;

                if (element.framePath !== "")
                {
                    const frameNavi = element.framePath.split("->");
                    frameNavi.forEach(frame => {
                        const frameBody = document.evaluate(
                            frame, // XPath expression
                            bodyNode, // Context node (document root)
                            null, // Namespace resolver (null if not needed)
                            XPathResult.FIRST_ORDERED_NODE_TYPE, // Result type to get the first matching node
                            null // Result object (null if not reusing an existing result)
                        );

                        if (frameBody.singleNodeValue !== null)
                        {
                            // console.log("move body",frameBody.singleNodeValue);
                            bodyNode = frameBody.singleNodeValue.contentDocument;
                        }
                    });
                }

                parentResult = document.evaluate(
                    elementXpath, // XPath expression
                    bodyNode, // Context node (document root)
                    null, // Namespace resolver (null if not needed)
                    XPathResult.FIRST_ORDERED_NODE_TYPE, // Result type to get the first matching node
                    null // Result object (null if not reusing an existing result)
                );
                console.log("parentResult",parentResult);
                
                
        
                // Retrieve the parent element
                const parent = parentResult.singleNodeValue;
                console.log("parent",parent);
                console.log(`!inList(A11yTree, elementXpath) ${elementXpath}`, !inList(A11yTree, elementXpath));
        
                if (parent && !inList(A11yTree, elementXpath) && (parent.tagName.toLowerCase()=== "a" ||parent.hasAttribute('tabby-has-listener'))) {
                    // Has children with that are in A11yTree
                    // Evaluate XPath to find any descendants with the attribute
                    const descendantResult = document.evaluate(
                        './/*[@purple_tabby_a11ytree="true"]', // XPath expression to find any descendants
                        parent, // Context node (parent element)
                        null, // Namespace resolver (null if not needed)
                        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, // Result type to get all matching nodes
                        null // Result object (null if not reusing an existing result)
                    );
                    console.log("descendantResult", descendantResult);
        
                    console.log("descendantResult.snapshotLength === 0", descendantResult.snapshotLength === 0);
        
                    // Check if any descendants with the attribute were found
                    if (descendantResult.snapshotLength === 0) {
                        // Added the FramePath to the dict
                        if (!framesDict[element.framePath])
                        {
                            framesDict[element.framePath] = [];
                        }
                        framesDict[element.framePath].push({xpath:elementXpath,code:parent.outerHTML});
                        // Add to missing list if no descendants with the attribute are found
                        missing.push(elementXpath);
                    }


                }
            } catch (error) {
                console.error(`An error occurred while processing XPath:`, error);
            }
        });
        console.log("MISSING:",missing);

        const siteUrl = window.location.href;
        console.log(siteUrl);

        const data = {
            tabId:tab,
            missing:missing,
            framesDict:framesDict
        }
        chrome.runtime.sendMessage({ type: "MISSING_FOUND", data: data,siteUrl:siteUrl });
    }
    else if (message.type === "CHECK_SCANNING_PROCESS_JS")
    {
        sendResponse({ status: "SCANNING_PROCESS_READY" });
    }
})