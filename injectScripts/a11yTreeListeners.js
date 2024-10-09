let foundElements;

// New A11yTree Detection
const allowNonClickableFlagging = false; // Change this to true to flag non-clickable images
const landmarkElements = ['header', 'footer', 'nav', 'main', 'article', 'section', 'aside', 'form'];
const loggingEnabled = false; // Set to true to enable console warnings

let flaggedElementsByDocument = {}; // Object mapping document root XPath to flagged elements
let previousFlaggedXPathsByDocument = {}; // Object to hold previous flagged XPaths
let allFlaggedElementsXPaths = []; // Array to store all flagged XPaths

let data;
let currentSiteURL;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    /* 
        This is used to send message to debug back into background.js
        Cause cannot send background to background
     */
    if (message.type === "FIND_MISSING")
    {
        console.log("FIND_MISSING");
        flagElements();
        console.log("previousFlaggedXPathsByDocument",previousFlaggedXPathsByDocument);
        console.log("allFlaggedElementsXPaths",allFlaggedElementsXPaths)
        const tabId = message.tabId;
        data = {
            tabId:tabId,
            missing:allFlaggedElementsXPaths,
            framesDict:previousFlaggedXPathsByDocument
        }
        currentSiteURL = window.location.href;
        chrome.runtime.sendMessage({ type: "MISSING_FOUND", data: data,siteUrl:currentSiteURL });

    }
    else if (message.type === "Can_Get_Tree") {
        console.log("Received Can_Get_Tree message");
        const tabId = message.tabId;

        // Handle the message and process the AX tree in background
        chrome.runtime.sendMessage({ type: "GET_AX_TREE", tabId: tabId });
    }
    else if (message.type === "FULL_A11yTree_DOM_XPATHS")
    {
        foundElements = a11yTreeToDOM();
        const data =
        {
            foundElements:foundElements,
            tabId : message.data.tabId
        }
        chrome.runtime.sendMessage({ type: "A11yTree_DOM_XPATHS_DONE", data: data });
    }
    else if (message.type === "A11yTree_Stored")
    {
        chrome.runtime.sendMessage({ type: "A11yTree_Stored"});
    }
    /* 
        Changes the overlay to add the xpath of the missing
    */
    else if (message.type === "AX_TREE")
    {
        const treeContainer = document.getElementById('treeContent');
        if (treeContainer) {
            treeContainer.textContent = JSON.stringify(message.data, null, 2);
        } else {
            console.error("Element with ID 'treeContent' not found.");
        }
    }
    else if (message.type === "CHECK_A11Y_TREE_LISTENERS_JS")
    {
        sendResponse({ status: "A11Y_LISTENERS_READY" });
    }

});



function findAllWithAttribute(selector, root = document) {
    const elements = Array.from(root.querySelectorAll(selector));

    // Search through both shadow roots and iframes/frames recursively
    const allElements = root.querySelectorAll('*');
    allElements.forEach(el => {
        // Check for shadow DOM and recursively search
        if (el.shadowRoot) {
            elements.push(...findAllWithAttribute(selector, el.shadowRoot));
        }

        // Check for iframes/frames and recursively search
        if (el.tagName.toLowerCase() === 'iframe' || el.tagName.toLowerCase() === 'frame') {
            try {
                const iframeDocument = el.contentDocument || el.contentWindow.document;
                if (iframeDocument) {
                    elements.push(...findAllWithAttribute(selector, iframeDocument));
                }
            } catch (error) {
                console.warn('Cross-origin iframe or other error:', error);
            }
        }
    });

    return elements;
}


function a11yTreeToDOM()
{
    try {
        const elementsWithPurpleTabby = findAllWithAttribute('[purple_tabby_a11ytree]');
        // console.log("a11yTreeToDOM_elementsWithPurpleTabby",elementsWithPurpleTabby)
        // console.log()
        const foundElements = []
        elementsWithPurpleTabby.forEach(element => {
            const xpath = getXPath(element)
            if (xpath)
            {
                foundElements.push(xpath);
            }
        });
        // console.log("a11yTreeToDOM foundElements",foundElements)
        return foundElements;
    }
    catch(error)
    {
        console.log("a11yTreeToDOM() as an error",error)
    }
    
}


// -------------------- New A11yTree Detection -------------------
function customConsoleWarn(message, data) {
    if (loggingEnabled) {
        if (data) {
            console.warn(message, data);
        } else {
            console.warn(message);
        }
    }
}

function hasPointerCursor(element) {
    const computedStyle = element.ownerDocument.defaultView.getComputedStyle(element);
    const hasPointerStyle = computedStyle.cursor === 'pointer' || computedStyle.cursor === 'default';
    const hasOnClick = element.hasAttribute('onclick');
    const hasEventListeners = Object.keys(element).some(prop => prop.startsWith('on'));
    return hasPointerStyle || hasOnClick || hasEventListeners;
}

function getElementById(element, id) {
    return element.ownerDocument.getElementById(id);
}

function getAriaLabelledByText(element) {
    const labelledById = element.getAttribute('aria-labelledby');
    if (labelledById) {
        const labelledByElement = getElementById(element, labelledById);
        if (labelledByElement) {
            const ariaLabel = labelledByElement.getAttribute('aria-label');
            return ariaLabel ? ariaLabel.trim() : labelledByElement.textContent.trim();
        }
    }
    return '';
}

function getAriaDescribedByText(element) {
    const describedById = element.getAttribute('aria-describedby');
    if (describedById) {
        const describedByElement = getElementById(element, describedById);
        if (describedByElement) {
            const ariaLabel = describedByElement.getAttribute('aria-label');
            return ariaLabel ? ariaLabel.trim() : describedByElement.textContent.trim();
        }
    }
    return '';
}

function hasAccessibleLabel(element) {
    const ariaLabel = element.getAttribute('aria-label');
    const ariaLabelledByText = getAriaLabelledByText(element);
    const ariaDescribedByText = getAriaDescribedByText(element);
    const altText = element.getAttribute('alt');
    const title = element.getAttribute('title');

    return (ariaLabel && ariaLabel.trim().length > 0) ||
           (ariaLabelledByText && ariaLabelledByText.length > 0) ||
           (ariaDescribedByText && ariaDescribedByText.length > 0) ||
           (altText && altText.trim().length > 0) ||
           (title && title.trim().length > 0);
}

function hasSummaryOrDetailsLabel(element) {
    const summary = element.closest('summary, details');
    return summary && hasAccessibleLabel(summary);
}

function hasSiblingWithAccessibleLabel(element) {
    const sibling = element.nextElementSibling || element.previousElementSibling;
    return sibling && hasAccessibleLabel(sibling);
}

function hasSiblingOrParentAccessibleLabel(element) {
    const parent = element.closest('a, button, [aria-label]');
    if (parent && hasAccessibleLabel(parent)) {
        return true;
    }

    return hasSiblingWithAccessibleLabel(element);
}

function hasChildWithAccessibleText(element) {
    return Array.from(element.children).some(child => {
        return child.textContent.trim().length > 0 || hasAccessibleLabel(child);
    });
}

function hasAllChildrenAccessible(element) {
    // If the element has an accessible label or text content, consider it accessible
    if (hasAccessibleLabel(element) || element.textContent.trim().length > 0) {
        return true;
    }

    // If the element has children, check if all children are accessible
    if (element.children.length > 0) {
        return Array.from(element.children).every(child => {
            return hasAllChildrenAccessible(child);
        });
    }

    // If the element has no accessible label, no text content, and no children, it's not accessible
    return false;
}

// function getXPath(element) {
//     if (!element) return null;
//     if (element.id) {
//         return `//*[@id="${element.id}"]`;
//     }
//     if (element === element.ownerDocument.body) {
//         return "/html/body";
//     }
//     if (!element.parentNode || element.parentNode.nodeType !== 1) {
//         return '';
//     }

//     const siblings = Array.from(element.parentNode.childNodes)
//         .filter(node => node.nodeName === element.nodeName);
//     const ix = siblings.indexOf(element) + 1;
//     const siblingIndex = siblings.length > 1 ? `[${ix}]` : "";
//     return `${getXPath(element.parentNode)}/${element.nodeName.toLowerCase()}${siblingIndex}`;
// }

const style = document.createElement('style');
style.innerHTML = `
    .highlight-flagged {
        border: 4px solid purple !important;
        box-shadow: 0 0 10px 5px rgba(255, 255, 255, 0.8), 0 0 10px rgba(144, 33, 166, 1) !important;
        position: relative !important; /* Ensure positioning for the border */
    }
`;
document.head.appendChild(style);

function injectStylesIntoFrame(frame) {
    try {
        const frameDocument = frame.contentDocument || frame.contentWindow.document;
        if (frameDocument) {
            const frameStyle = frameDocument.createElement('style');
            frameStyle.innerHTML = `
                .highlight-flagged {
                    border: 4px solid purple !important;
                    box-shadow: 0 0 10px 5px rgba(255, 255, 255, 0.8), 0 0 10px rgba(144, 33, 166, 1) !important;
                    position: relative !important;
                }
            `;
            frameDocument.head.appendChild(frameStyle);
        }
    } catch (error) {
        customConsoleWarn("Cannot access frame document: " + error);
    }
}

function shouldFlagElement(element, allowNonClickableFlagging) {
    if (!element || !(element instanceof Element)) {
        customConsoleWarn("Element is null or not a valid Element.");
        return false;
    }

    // Do not flag elements with aria-hidden="true"
    if (element.getAttribute('aria-hidden') === 'true') {
        customConsoleWarn("Element is aria-hidden, skipping flagging.");
        return false;
    }

    // Do not flag elements with role="presentation"
    if (element.getAttribute('role') === 'presentation') {
        customConsoleWarn("Element has role='presentation', skipping flagging.");
        return false;
    }

    if (element.dataset.flagged === 'true') {
        customConsoleWarn("Element is already flagged.");
        return false;
    }

    // If an ancestor element is flagged, do not flag this element
    if (element.closest('[data-flagged="true"]')) {
        customConsoleWarn("An ancestor element is already flagged.");
        return false;
    }

    // Skip elements that are not visible (e.g., display:none)
    const computedStyle = element.ownerDocument.defaultView.getComputedStyle(element);
    if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden' || element.offsetParent === null) {
        customConsoleWarn("Element is not visible, skipping flagging.");
        return false;
    }

    // Skip empty <div> or <span> elements without any accessible text or children with accessible labels, unless they have a pointer cursor
    if ((element.nodeName.toLowerCase() === 'div' || element.nodeName.toLowerCase() === 'span') && element.children.length === 0 && element.textContent.trim().length === 0) {
        if (!hasPointerCursor(element)) {
            customConsoleWarn("Empty div or span without accessible text and without pointer cursor, skipping flagging.");
            return false;
        }
    
        // Additional check: Ensure parent element with accessible label is not overlooked
        const parentWithAccessibleLabel = element.closest('[aria-label], [role="button"], a, button');
        if (parentWithAccessibleLabel && (hasAccessibleLabel(parentWithAccessibleLabel) || hasChildWithAccessibleText(parentWithAccessibleLabel))) {
            customConsoleWarn("Parent element has an accessible label, skipping flagging of empty clickable div or span.");
            return false;
        }
    
        customConsoleWarn("Flagging clickable div or span with pointer cursor and no accessible text.");
        return true;
    }

    // Skip elements with role="menuitem" and ensure accessibility label for any nested elements
    if (element.getAttribute('role') === 'menuitem') {
        if (hasChildWithAccessibleText(element)) {
            customConsoleWarn("Menuitem element has child with accessible text, skipping flagging.");
            return false;
        }
    }

    // Check if the element itself has an accessible label
    if (hasAccessibleLabel(element) || element.textContent.trim().length > 0) {
        customConsoleWarn("Element has an accessible label or visible text, skipping flagging.");
        return false;
    }

    // Check if the parent element has an accessible label
    const parent = element.closest('[aria-label], [role="button"], a, button');
    if (parent && (hasAccessibleLabel(parent) || hasChildWithAccessibleText(parent))) {
        customConsoleWarn("Parent element has an accessible label or accessible child, skipping flagging.");
        return false;
    }

    // Skip flagging if any child has an accessible label (e.g., <img alt="...">
    if (hasChildWithAccessibleText(element)) {
        customConsoleWarn("Element has child nodes with accessible text.");
        return false;
    }

    // Check if the <a> element has all children accessible
    if (element.nodeName.toLowerCase() === 'a' && hasAllChildrenAccessible(element)) {
        customConsoleWarn("Hyperlink has all children with accessible labels, skipping flagging.");
        return false;
    }

    if (element.hasAttribute('tabindex') && element.getAttribute('tabindex') === '-1') {
        customConsoleWarn("Element has tabindex='-1'.");
        return false;
    }

    const childWithTabindexNegativeOne = Array.from(element.children).some(child =>
        child.hasAttribute('tabindex') && child.getAttribute('tabindex') === '-1'
    );
    if (childWithTabindexNegativeOne) {
        customConsoleWarn("Element has a child with tabindex='-1'.");
        return false;
    }

    if (landmarkElements.includes(element.nodeName.toLowerCase())) {
        customConsoleWarn("Element is a landmark element.");
        return false;
    }
    
    // Prevent flagging <svg> or <icon> if a sibling or parent has an accessible label or if it is part of a button-like element
    if ((element.nodeName.toLowerCase() === 'svg' || element.nodeName.toLowerCase() === 'icon') && (element.getAttribute('focusable') === 'false' || hasSiblingOrParentAccessibleLabel(element) || element.closest('[role="button"]') || element.closest('button'))) {
        customConsoleWarn("Sibling or parent element has an accessible label or svg is part of a button, skipping flagging of svg or icon.");
        return false;
    }

    if (element.nodeName.toLowerCase() === 'svg') {
        const parentGroup = element.closest('g');
        if (parentGroup && parentGroup.querySelector('title')) {
            customConsoleWarn("Parent group element has a <title>, skipping flagging of svg.");
            return false;
        }
    }

    if (element.nodeName.toLowerCase() === 'button') {
        const hasAccessibleLabelForButton = hasAccessibleLabel(element) || element.textContent.trim().length > 0;
        if (hasAccessibleLabelForButton) {
            customConsoleWarn("Button has an accessible label, skipping flagging.");
            return false;
        }

        const hasSvgChildWithoutLabel = Array.from(element.children).some(child => child.nodeName.toLowerCase() === 'svg' && !hasAccessibleLabel(child));
        if (hasSvgChildWithoutLabel) {
            customConsoleWarn("Flagging button with child SVG lacking accessible label.");
            return true;
        }
    }

    if (element.nodeName.toLowerCase() === 'input' && element.type === 'image' && !hasAccessibleLabel(element)) {
        customConsoleWarn("Flagging <input type='image'> without accessible label.");
        return true;
    }

    if (element.nodeName.toLowerCase() === 'a') {
        const img = element.querySelector('img');
    
        // Log to verify visibility and pointer checks
        customConsoleWarn("Processing <a> element.");
    
        // Ensure this <a> does not have an accessible label
        const linkHasAccessibleLabel = hasAccessibleLabel(element);
    
        // Ensure the <img> inside <a> does not have an accessible label
        const imgHasAccessibleLabel = img ? hasAccessibleLabel(img) : false;
    
        // Log to verify if <img> has accessible label
        if (img) {
            customConsoleWarn("Found <img> inside <a>. Accessible label: " + imgHasAccessibleLabel);
        } else {
            customConsoleWarn("No <img> found inside <a>.");
        }
    
        // Flag if both <a> and <img> inside lack accessible labels
        if (!linkHasAccessibleLabel && img && !imgHasAccessibleLabel) {
            customConsoleWarn("Flagging <a> with inaccessible <img>.");
            return true;
        }
    
        // Skip flagging if <a> has an accessible label or all children are accessible
        if (linkHasAccessibleLabel || hasAllChildrenAccessible(element)) {
            customConsoleWarn("Hyperlink has an accessible label, skipping flagging.");
            return false;
        }
    }
    
    // Modify this section for generic elements
    if (['span', 'div', 'icon', 'svg', 'button'].includes(element.nodeName.toLowerCase())) {
        if (element.nodeName.toLowerCase() === 'icon' || element.nodeName.toLowerCase() === 'svg') {
            // Check if the element has an accessible label or if it has a sibling, parent, or summary/related element that provides an accessible label
            if (!hasAccessibleLabel(element) && !hasSiblingOrParentAccessibleLabel(element) && !hasSummaryOrDetailsLabel(element) && element.getAttribute('focusable') !== 'false') {
                customConsoleWarn("Flagging icon or svg without accessible label.");
                return true;
            }
            return false;
        }

        if (element.textContent.trim().length > 0) {
            customConsoleWarn("Element has valid text content.");
            return false;
        }

        if (element.hasAttribute('aria-label') && element.getAttribute('aria-label').trim().length > 0) {
            customConsoleWarn("Element has an aria-label attribute, skipping flagging.");
            return false;
        }
    }

    if (element.nodeName.toLowerCase() === 'div') {
        const flaggedChild = Array.from(element.children).some(child => child.dataset.flagged === 'true');
        if (flaggedChild) {
            customConsoleWarn("Div contains a flagged child, flagging only outermost element.");
            return false;
        }

        if (element.textContent.trim().length > 0) {
            customConsoleWarn("Div has valid text content.");
            return false;
        }

        const img = element.querySelector('img');
        if (img) {
            const altText = img.getAttribute('alt');
            const ariaLabel = img.getAttribute('aria-label');
            const ariaLabelledByText = getAriaLabelledByText(img);
            const ariaDescribedByText = getAriaDescribedByText(img);
            if (altText !== null || ariaLabel || ariaLabelledByText || ariaDescribedByText) {
                customConsoleWarn("Div contains an accessible img or an img with an alt attribute (even if empty).");
                return false;
            }
        }

        const svg = element.querySelector('svg');
        if (svg) {
            if (hasPointerCursor(element) && !hasAccessibleLabel(svg) && !hasSummaryOrDetailsLabel(svg) && svg.getAttribute('focusable') !== 'false') {
                customConsoleWarn("Flagging clickable div with SVG without accessible label.");
                return true;
            }
        }

        if (hasPointerCursor(element) && !hasAccessibleLabel(element)) {
            customConsoleWarn("Clickable div without accessible label.");
            return true;
        }
    }

    if (element.nodeName.toLowerCase() === 'img' || element.nodeName.toLowerCase() === 'picture') {
        const imgElement = element.nodeName.toLowerCase() === 'picture' ? element.querySelector('img') : element;
        const altText = imgElement.getAttribute('alt');
        const ariaLabel = imgElement.getAttribute('aria-label');
        const ariaLabelledByText = getAriaLabelledByText(imgElement);
        const ariaDescribedByText = getAriaDescribedByText(imgElement);

        if (!allowNonClickableFlagging) {
            if (!imgElement.closest('a') && !imgElement.closest('button') && !hasPointerCursor(imgElement) && !(altText !== null) && !(ariaLabel && ariaLabel.trim().length > 0) && !(ariaLabelledByText && ariaLabelledByText.length > 0) && !(ariaDescribedByText && ariaDescribedByText.length > 0)) {
                customConsoleWarn("Non-clickable image ignored.");
                return false;
            }
        }

        if (!imgElement.closest('a') && !imgElement.closest('button') && !(altText !== null) && !(ariaLabel && ariaLabel.trim().length > 0) && !(ariaLabelledByText && ariaLabelledByText.length > 0) && !(ariaDescribedByText && ariaDescribedByText.length > 0)) {
            customConsoleWarn("Flagging img or picture without accessible label.");
            return true;
        }
    }

    // Additional check to skip divs with empty children or child-child elements
    const areAllDescendantsEmpty = Array.from(element.querySelectorAll('*')).every(child => child.textContent.trim().length === 0 && !hasAccessibleLabel(child));
    if (element.nodeName.toLowerCase() === 'div' && areAllDescendantsEmpty) {
        customConsoleWarn("Div with empty descendants, skipping flagging.");
        return false;
    }

    return false; // Default case: do not flag
}


function flagElements() {
    console.time("Accessibility Check Time");

    const currentFlaggedElementsByDocument = {}; // Temporary object to hold current flagged elements

    // Process main document
    const currentFlaggedElements = [];
    const allElements = document.querySelectorAll('*');
    allElements.forEach(element => {
        if (shouldFlagElement(element, allowNonClickableFlagging)) {
            element.dataset.flagged = 'true'; // Mark element as flagged
            currentFlaggedElements.push(element);
        }
    });
    currentFlaggedElementsByDocument[""] = currentFlaggedElements; // Key "" represents the main document

    // Process iframes
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach((iframe, index) => {
        injectStylesIntoFrame(iframe);
        try {
            const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
            if (iframeDocument) {
                const iframeFlaggedElements = [];
                const iframeElements = iframeDocument.querySelectorAll('*');
                iframeElements.forEach(element => {
                    if (shouldFlagElement(element, allowNonClickableFlagging)) {
                        element.dataset.flagged = 'true'; // Mark element as flagged
                        iframeFlaggedElements.push(element);
                    }
                });
                const iframeXPath = getXPath(iframe);
                currentFlaggedElementsByDocument[iframeXPath] = iframeFlaggedElements;
            }
        } catch (error) {
            console.warn(`Cannot access iframe document (${index}): ${error.message}`);
        }
    });

    // Collect XPaths and outerHTMLs of flagged elements per document
    const flaggedXPathsByDocument = {};

    for (const docKey in currentFlaggedElementsByDocument) {
        const elements = currentFlaggedElementsByDocument[docKey];
        const flaggedInfo = []; // Array to hold flagged element info
        elements.forEach(flaggedElement => {
            const parentFlagged = flaggedElement.closest('[data-flagged="true"]');
            if (!parentFlagged || parentFlagged === flaggedElement) {
                let xpath = getXPath(flaggedElement);
                if (docKey !== "") {
                    // For elements in iframes, adjust XPath
                    xpath = docKey + xpath;
                }
                if (xpath) {
                    const outerHTML = flaggedElement.outerHTML; // Get outerHTML
                    flaggedInfo.push({ xpath, code: outerHTML }); // Store xpath and outerHTML
                    
                    // Add to allFlaggedElementsXPaths
                    allFlaggedElementsXPaths.push({ xpath, code: outerHTML });
                }
            }
        });
        flaggedXPathsByDocument[docKey] = flaggedInfo; // Store all flagged element info
    }

    // Update previousFlaggedXPathsByDocument before finishing
    previousFlaggedXPathsByDocument = { ...flaggedXPathsByDocument };

    // Log both variables to verify they're populated
    console.log("Updated previousFlaggedXPathsByDocument:", previousFlaggedXPathsByDocument);
    console.log("All flagged elements XPaths:", allFlaggedElementsXPaths);

    console.timeEnd("Accessibility Check Time");
}


// Debounce function to limit the rate at which a function can fire
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Initial flagging when the script first runs
// flagElements();
// toggleHighlight(window.showHighlights);
// console.log("flaggedElementsByDocument",flaggedElementsByDocument);
// console.log("allFlaggedElementsXPaths",allFlaggedElementsXPaths);
// console.log("previousFlaggedXPathsByDocument",previousFlaggedXPathsByDocument);