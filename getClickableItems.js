console.log("getClickableItems Injected");

async function getClickableItems() {
    const clickElements = [];

    async function traverseDOM(node) {
        // If the current node is an iframe or frame, handle it separately
        if (node.nodeName.toLowerCase() === "iframe" || node.nodeName.toLowerCase() === "frame") {
            try {
                // Access the contentDocument of the frame/iframe
                const frameDocument = node.contentDocument || node.contentWindow.document;
                if (frameDocument) {
                    // Recursively process the content of the iframe/frame
                    await traverseDOM(frameDocument.body);
                }
            } catch (e) {
                console.warn('Unable to access frame document due to cross-origin restrictions:', e);
            }
        } else {
            // Process the current node if it's not a frame/iframe
            await processElement(node, clickElements);

            // Recursively traverse through the child nodes
            for (let child of node.children) {
                await traverseDOM(child);
            }
        }
    }

    try {
        let currentNode = document.body;
        if (currentNode.nodeName.toLowerCase() === "frameset") {
            // If the body is a frameset, navigate through frames to find the actual body tag
            const frames = Array.from(document.querySelectorAll('frame, iframe'));

            for (let frame of frames) {
                try {
                    const frameDocument = frame.contentDocument || frame.contentWindow.document;
                    if (frameDocument && frameDocument.body.nodeName.toLowerCase() === 'body') {
                        currentNode = frameDocument.body;
                        break; // Stop searching after finding the first body
                    }
                } catch (e) {
                    console.warn('Unable to access frame document due to cross-origin restrictions:', e);
                }
            }
        }

        // Start the traversal from the current node (which is either document.body or a frame's body)
        await traverseDOM(currentNode);
        console.log('All elements processed.');
    } catch (error) {
        console.error('Error in querying elements:', error);
    }

    console.log("Testing", clickElements);
    return clickElements;
}
// Function to check if an element is visible
const isVisible = (el) => {
    try {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    } catch (error) {
        console.error('Error in isVisible:', error);
        return false;
    }
};

async function isItPointer(el, clickElements) {
    const style = window.getComputedStyle(el);

    if ((style.cursor === 'pointer') && isVisible(el)) {
        const path = getXPath(el);

        if (el.tagName.toLowerCase() === 'a') {
            if (!el.hasAttribute('href')) {
                console.log("Did it get here?");
                console.log("Did it get here? path", path);
                clickElements.push(path);
            }
        } else {
            if (path !== "skip") {
                clickElements.push(path);
            }
        }
    } else {
        console.log("FAIL style.cursor === 'pointer' && isVisible(el)");
    }

    if (el.shadowRoot) {
        const shadowRootItems = el.shadowRoot.querySelectorAll('*');
        shadowRootItems.forEach(element => {
            try {
                const style = window.getComputedStyle(element);
                if (style.cursor === 'pointer' && isVisible(element)) {
                    clickElements.push(getXPath(element));
                }
            } catch (error) {
                console.error('Error in shadow root element:', error);
            }
        });
    }
}
// Function to process each element and return a promise
const processElement = async (el, clickElements, elements) => {
    try {
        // Check if the element is an Iframe or Frame
        if (el.nodeName.toLowerCase() === "iframe" || el.nodeName.toLowerCase() === "frame") {
            console.log("We got an Iframe or frame here");

            // Access the contentDocument of each frame
            const frameDocument = el.contentDocument || el.contentWindow?.document;

            // Check if the frame's document has a body
            if (frameDocument && frameDocument.body && frameDocument.body.nodeName.toLowerCase() === 'body') {
                console.log("Adding to checking List", frameDocument.body.querySelectorAll('*:not(a[href])'));

                // Add elements from the frame's document to the elements list
                elements.push(...Array.from(frameDocument.body.querySelectorAll('*:not(a[href])'))); // Use Array.from to convert NodeList to array
            }
        }

        // Check if the element is a pointer (or any other condition you need)
        await isItPointer(el, clickElements);
    } catch (error) {
        console.error('Error in processing element:', error);
    }
};
