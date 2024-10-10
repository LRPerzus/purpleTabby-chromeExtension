/* 
    In this script is a commons/reuseable code placed in here.
    This script will be injected into every webpage.
*/

console.log("Content script loaded");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "CHECK_CONTENT_JS") {
        sendResponse({ status: "CONTENT_READY" });
    }
});

// Get the XPath of the element
const getXPath = (element) => {
    if (!element) return '';

    let xPath = '';
    let currentElement = element;

    while (currentElement && currentElement.nodeType === Node.ELEMENT_NODE) {
        let index = 1;
        let sibling = currentElement.previousElementSibling;

        // Count preceding siblings with the same tag name
        while (sibling) {
            if (sibling.tagName === currentElement.tagName) {
                index++;
            }
            sibling = sibling.previousElementSibling;
        }

        const tagName = currentElement.tagName.toLowerCase();
        const id = `[${index}]`;
        xPath = '/' + tagName + id + xPath;

        // Check if the current element is inside a shadow DOM
        if (currentElement.parentNode instanceof ShadowRoot) {
            const hostElement = currentElement.parentNode.host;
            xPath = '/shadowRoot' + xPath;
            currentElement = hostElement;
        } else {
            currentElement = currentElement.parentNode;
        }
    }

    return xPath;
};