console.log("getClickableItems Injected");

async function getClickableItems() {
    const clickElements = [];

    async function traverseDOM(node, framePath = "") {
        // If the current node is an iframe or frame, handle it separately
        if (node.nodeName.toLowerCase() === "iframe" || node.nodeName.toLowerCase() === "frame") {
            try {
                // Access the contentDocument of the frame/iframe
                const frameDocument = node.contentDocument || node.contentWindow.document;
                if (frameDocument) {
                    const newFramePath = framePath ? `${framePath}->${getXPath(node)}` : getXPath(node);
                    // Recursively process the content of the iframe/frame
                    await traverseDOM(frameDocument.body, newFramePath);
                }
            } catch (e) {
                console.warn('Unable to access frame document due to cross-origin restrictions:', e);
            }
        } else {
            // Process the current node if it's not a frame/iframe
            await processElement(node, clickElements, framePath);

            // Recursively traverse through the child nodes
            for (let child of node.children) {
                await traverseDOM(child, framePath);
            }
        }
    }

    try {
        let currentNode = document.body;
        let framePath = "";

        if (currentNode.nodeName.toLowerCase() === "frameset") {
            // If the body is a frameset, navigate through frames to find the actual body tag
            const frames = Array.from(document.querySelectorAll('frame, iframe'));

            for (let frame of frames) {
                try {
                    const frameDocument = frame.contentDocument || frame.contentWindow.document;
                    if (frameDocument && frameDocument.body.nodeName.toLowerCase() === 'body') {
                        currentNode = frameDocument.body;
                        framePath = getXPath(frame); // Set the initial framePath
                        // Start the traversal from the current node (which is either document.body or a frame's body)
                        await traverseDOM(currentNode, framePath);
                    }
                } catch (e) {
                    console.warn('Unable to access frame document due to cross-origin restrictions:', e);
                }
            }
        }
        else{ // Just a normal document
             // Start the traversal from the current node (which is either document.body or a frame's body)
            await traverseDOM(currentNode, framePath);
        }

        console.log('All elements processed.');
    } catch (error) {
        console.error('Error in querying elements:', error);
    }

    return clickElements;
}
function isInOpenDetails(element) {
    let parentDetails = element.closest('details');
    return parentDetails ? parentDetails.open : true;
}
// Function to check if an element is visible
const isVisibleFocusAble = (el) => {
    try {
        if (!(el instanceof Element))
        {
            return false;
        }
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return (
            // Visible
            style.display !== 'none' 
            && style.visibility !== 'hidden' 
            && rect.width > 0 && rect.height > 0 
            // Focusable 
            && !el.hasAttribute('disabled')
            // <detail> tag will show it as visual so need to account for that
            && isInOpenDetails(el)
        );
    } catch (error) {
        console.error('Error in isVisible:', error);
        return false;
    }
};

async function isItPointer(el, clickElements, framePath = "") {
    const style = window.getComputedStyle(el);
    const path = getXPath(el);

    if ((style.cursor === 'pointer') && isVisibleFocusAble(el) && !el.parentElement.closest('[aria-hidden]') && el.getAttribute("aria-hidden") !== "true") {
        if (path !== "skip") {
            clickElements.push(
                {
                    path: path,
                    framePath: framePath
                }
            );
        }
    }

    if (el.shadowRoot) {
        const shadowRootItems = el.shadowRoot.querySelectorAll('*');
        shadowRootItems.forEach(element => {
            try {
                const style = window.getComputedStyle(element);
                if (style.cursor === 'pointer' && isVisibleFocusAble(element) && !element.closest('[aria-hidden]')) {
                    clickElements.push({
                        path: getXPath(element),
                        framePath: framePath
                    });
                }
            } catch (error) {
                console.error('Error in shadow root element:', error);
            }
        });
    }
}

// Function to process each element and return a promise
const processElement = async (el, clickElements, framePath = "") => {
    try {
        // Check if the element is a pointer (or any other condition you need)
        await isItPointer(el, clickElements, framePath);
    } catch (error) {
        console.error('Error in processing element:', error);
    }
};


// To ensure the scripts are injected
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "CHECK_GETCLICKABLE_JS") {
        sendResponse({ status: "GET_GETCLICKABL_READY" });
    }
});