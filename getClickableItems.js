console.log("getClickableItems Injected");

async function getClickableItems() {
    const clickElements = [];
    try {
        let currentNode = document.body
        console.log("currentNode",currentNode);
        if (currentNode.nodeName.toLowerCase() === "frameset") {
            // If the body is a frameset, navigate through frames to find the actual body tag
            const frames = Array.from(document.querySelectorAll('frame, iframe'));
        
            for (let frame of frames) {
                try {
                    // Access the contentDocument of each frame
                    const frameDocument = frame.contentDocument || frame.contentWindow.document;
        
                    // Check if the frame's document has a body
                    if (frameDocument && frameDocument.body && frameDocument.body.nodeName.toLowerCase() === 'body') {
                        currentNode = frameDocument.body;
                        break; // Stop searching after finding the first body
                    }
                } catch (e) {
                    console.warn('Unable to access frame document due to cross-origin restrictions:', e);
                }
            }
        }
        const elements = Array.from(currentNode.querySelectorAll('*:not(a[href])'));
        console.log("getClickableItems elements",elements)
        // Create an array of promises for processing each element
        const promises = elements.map(el => processElement(el,clickElements,elements));
        // Use Promise.all to wait for all promises to resolve
        Promise.all(promises)
            .then(() => {
                console.log('All elements processed.');
            })
            .catch(error => {
                console.error('Error processing elements:', error);
            });

    } catch (error) {
        console.error('Error in querying elements:', error);
    }

    console.log("Testing",clickElements)
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
