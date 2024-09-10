/* 
    In this script is a commons/reuseable code placed in here.
    This script will be injected into every webpage.
*/

console.log("Content script loaded");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "CHECK_CONTENT_JS") {
        sendResponse({ status: "CONTENT_READY" });
    }
    // if (message.type === "DOWNLOAD_AX_TREE") {
    //     console.log("message received");
    // // Ensure message.data is a JSON string
    // const json = JSON.stringify(message.data, null, 2); // Pretty print JSON with 2 spaces
    // const blob = new Blob([json], { type: 'application/json' });
    // const url = URL.createObjectURL(blob);

    // // Create a link element and trigger the download
    // const link = document.createElement('a');
    // link.href = url;
    // link.download = 'a11yTree.json';
    // document.body.appendChild(link);
    // link.click();
    // document.body.removeChild(link);
    // URL.revokeObjectURL(url);
    // }
    // else if (message.type === "DOWNLOAD_Name_A11yTree") {
    //     console.log("message received");
    //     const json = message.data;
    //     const blob = new Blob([json], { type: 'application/json' });
    //     const url = URL.createObjectURL(blob);

    //     // Create a link element and trigger the download
    //     const link = document.createElement('a');
    //     link.href = url;
    //     link.download = 'a11yTreeOnlyName.json';
    //     document.body.appendChild(link);
    //     link.click();
    //     document.body.removeChild(link);
    //     URL.revokeObjectURL(url);
    // }
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