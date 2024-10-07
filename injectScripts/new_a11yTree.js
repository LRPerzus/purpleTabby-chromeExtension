/* Content script (contentScript.js) */
const allowNonClickableFlagging = false; // Change this to true to flag non-clickable images
const landmarkElements = ['header', 'footer', 'nav', 'main', 'article', 'section', 'aside', 'form'];
const loggingEnabled = false; // Set to true to enable console warnings

let flaggedElements = []; // Array to hold flagged elements
const flaggedXPaths = []; // Array to hold XPath of flagged elements

function customConsoleWarn(message) {
    if (loggingEnabled) {
        console.warn(message);
    }
}

function hasPointerCursor(element) {
    const computedStyle = window.getComputedStyle(element);
    const hasPointerStyle = computedStyle.cursor === 'pointer' || computedStyle.cursor === 'default';
    const hasOnClick = element.hasAttribute('onclick');
    const hasEventListeners = Object.keys(element).some(prop => prop.startsWith('on'));
    return hasPointerStyle || hasOnClick || hasEventListeners;
}

function getElementById(id) {
    return document.getElementById(id);
}

function getAriaLabelledByText(element) {
    const labelledById = element.getAttribute('aria-labelledby');
    if (labelledById) {
        const labelledByElement = getElementById(labelledById);
        if (labelledByElement) {
            return labelledByElement.textContent.trim();
        }
    }
    return '';
}

function hasAccessibleLabel(element) {
    const ariaLabel = element.getAttribute('aria-label');
    const ariaLabelledByText = getAriaLabelledByText(element);
    const altText = element.getAttribute('alt');
    const title = element.getAttribute('title');
    return (ariaLabel && ariaLabel.trim().length > 0) ||
           (ariaLabelledByText && ariaLabelledByText.length > 0) ||
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

function getXPath(element) {
    if (!element) return null;
    if (element.id) {
        return `//*[@id="${element.id}"]`;
    }
    if (element === document.body) {
        return "/html/body";
    }
    if (!element.parentNode) {
        return '';
    }

    const ix = Array.from(element.parentNode.childNodes)
        .filter(node => node.nodeName === element.nodeName)
        .indexOf(element) + 1;
    const siblingIndex = ix > 1 ? `[${ix}]` : "";
    return `${getXPath(element.parentNode)}/${element.nodeName.toLowerCase()}${siblingIndex}`;
}

const style = document.createElement('style');
style.innerHTML = `
    .highlight-flagged {
        border: 4px solid purple !important;
        box-shadow: 0 0 10px rgba(144, 33, 166, 1) !important;
        position: relative !important; /* Ensure positioning for the border */
    }
`;
document.head.appendChild(style);

function injectStylesIntoFrame(frame) {
    try {
        const frameDocument = frame.contentDocument || frame.contentWindow.document;
        if (frameDocument) {
            const frameStyle = document.createElement('style');
            frameStyle.innerHTML = style.innerHTML; // Copy the same styles
            frameDocument.head.appendChild(frameStyle); // Inject styles into the frame
        }
    } catch (error) {
        customConsoleWarn("Cannot access frame document: " + error); // Log error for inaccessible frames
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
    const computedStyle = window.getComputedStyle(element);
    if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden' || element.offsetParent === null) {
        customConsoleWarn("Element is not visible, skipping flagging.");
        return false;
    }

    // Skip empty <div> or <span> elements without any accessible text or children with accessible labels
    if ((element.nodeName.toLowerCase() === 'div' || element.nodeName.toLowerCase() === 'span') && element.children.length === 0 && element.textContent.trim().length === 0) {
        customConsoleWarn("Empty div or span without accessible text, skipping flagging.");
        return false;
    }

    // Check if the element itself (e.g., <a> or <button>) has an accessible label
    if ((element.nodeName.toLowerCase() === 'a' || element.nodeName.toLowerCase() === 'button') && (hasAccessibleLabel(element) || element.textContent.trim().length > 0)) {
        customConsoleWarn("Element has an accessible label or visible text, skipping flagging.");
        return false;
    }

    // Check if the parent element (e.g., <a> or <button>) has an accessible label
    const parent = element.closest('a, button, [aria-label]');
    if (parent && (hasAccessibleLabel(parent) || hasChildWithAccessibleText(parent))) {
        customConsoleWarn("Parent element has an accessible label or accessible child, skipping flagging.");
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
    if ((element.nodeName.toLowerCase() === 'svg' || element.nodeName.toLowerCase() === 'icon') && (element.getAttribute('focusable') === 'false' || hasSiblingOrParentAccessibleLabel(element) || element.closest('[role="button"]'))) {
        customConsoleWarn("Sibling or parent element has an accessible label or svg is part of a button, skipping flagging of svg or icon.");
        return false;
    }

    if (hasChildWithAccessibleText(element)) {
        customConsoleWarn("Element has child nodes with accessible text.");
        return false;
    }

    if (element.nodeName.toLowerCase() === 'input' && element.type === 'image' && !hasAccessibleLabel(element)) {
        customConsoleWarn("Flagging <input type='image'> without accessible label.");
        flaggedElements.push(element);
        return true;
    }

    if (element.nodeName.toLowerCase() === 'button') {
        if (!hasAccessibleLabel(element) && element.textContent.trim().length === 0) {
            customConsoleWarn("Flagging button without accessible label or visible text.");
            flaggedElements.push(element);
            return true;
        }
    }

    if (element.nodeName.toLowerCase() === 'a') {
        const accessibleLabelElements = Array.from(element.children).filter(child => {
            return (child.textContent.trim().length > 0 || (child.nodeName.toLowerCase() === 'svg' && hasAccessibleLabel(child)));
        });

        const hasTitleAttribute = element.hasAttribute('title') && element.getAttribute('title').trim().length > 0;

        if (accessibleLabelElements.length > 0 || hasTitleAttribute) {
            customConsoleWarn("Hyperlink has an accessible label or title attribute.");
            return false;
        }

        const img = element.querySelector('img');
        if (img && !hasAccessibleLabel(img)) {
            customConsoleWarn("Flagging hyperlink with inaccessible image.");
            flaggedElements.push(element);
            return true;
        }
    }

    // Modify this section for generic elements
    if (['span', 'div', 'icon', 'svg', 'button'].includes(element.nodeName.toLowerCase())) {
        if (element.nodeName.toLowerCase() === 'icon' || element.nodeName.toLowerCase() === 'svg') {
            // Check if the element has an accessible label or if it has a sibling, parent, or summary/related element that provides an accessible label
            if (!hasAccessibleLabel(element) && !hasSiblingOrParentAccessibleLabel(element) && !hasSummaryOrDetailsLabel(element) && element.getAttribute('focusable') !== 'false') {
                customConsoleWarn("Flagging icon or svg without accessible label.");
                flaggedElements.push(element);
                element.dataset.flagged = 'true';
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
            if (altText || ariaLabel || ariaLabelledByText) {
                customConsoleWarn("Div contains an accessible img.");
                return false;
            }
        }

        const svg = element.querySelector('svg');
        if (svg) {
            if (hasPointerCursor(element) && !hasAccessibleLabel(svg) && !hasSummaryOrDetailsLabel(svg) && svg.getAttribute('focusable') !== 'false') {
                customConsoleWarn("Flagging clickable div with SVG without accessible label.");
                flaggedElements.push(element);
                return true;
            }
        }

        if (hasPointerCursor(element) && !hasAccessibleLabel(element)) {
            customConsoleWarn("Clickable div without accessible label.");
            flaggedElements.push(element);
            return true;
        }
    }

    if (element.nodeName.toLowerCase() === 'img' || element.nodeName.toLowerCase() === 'picture') {
        const imgElement = element.nodeName.toLowerCase() === 'picture' ? element.querySelector('img') : element;
        const altText = imgElement.getAttribute('alt');
        const ariaLabel = imgElement.getAttribute('aria-label');
        const ariaLabelledByText = getAriaLabelledByText(imgElement);

        if (!allowNonClickableFlagging) {
            if (!imgElement.closest('a') && !imgElement.closest('button') && !hasPointerCursor(imgElement) && !(altText && altText.trim().length > 0) && !(ariaLabel && ariaLabel.trim().length > 0) && !(ariaLabelledByText && ariaLabelledByText.length > 0)) {
                customConsoleWarn("Non-clickable image ignored.");
                return false;
            }
        }

        if (!imgElement.closest('a') && !imgElement.closest('button') && !(altText && altText.trim().length > 0) && !(ariaLabel && ariaLabel.trim().length > 0) && !(ariaLabelledByText && ariaLabelledByText.length > 0)) {
            customConsoleWarn("Flagging img or picture without accessible label.");
            flaggedElements.push(imgElement);
            return true;
        }
    }

    return false; // Default case: do not flag
}

function flagElements() {
    console.time("Accessibility Check Time");

    const allElements = document.querySelectorAll('*');
    allElements.forEach(element => {
        if (shouldFlagElement(element, allowNonClickableFlagging)) {
            element.dataset.flagged = 'true'; // Mark element as flagged
        }
    });

    // Check all iframes in the document and flag elements in them
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
        injectStylesIntoFrame(iframe);
        try {
            const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
            if (iframeDocument) {
                const iframeElements = iframeDocument.querySelectorAll('*');
                iframeElements.forEach(element => {
                    if (shouldFlagElement(element, allowNonClickableFlagging)) {
                        element.dataset.flagged = 'true'; // Mark element as flagged
                    }
                });
            }
        } catch (error) {
            customConsoleWarn("Cannot access iframe document: " + error); // Log error for inaccessible iframes
        }
    });

    // Check all frames in the document and flag elements in them
    const frames = document.querySelectorAll('frame');
    frames.forEach(frame => {
        injectStylesIntoFrame(frame);
        try {
            const frameDocument = frame.contentDocument || frame.contentWindow.document;
            if (frameDocument) {
                const frameElements = frameDocument.querySelectorAll('*');
                frameElements.forEach(element => {
                    if (shouldFlagElement(element, allowNonClickableFlagging)) {
                        element.dataset.flagged = 'true'; // Mark element as flagged
                    }
                });
            }
        } catch (error) {
            customConsoleWarn("Cannot access frame document: " + error); // Log error for inaccessible frames
        }
    });

    console.timeEnd("Accessibility Check Time");

    // Collect the XPath of flagged elements without duplicates
    flaggedElements.forEach(flaggedElement => {
        const parentFlagged = flaggedElement.closest('[data-flagged="true"]');
        if (!parentFlagged || parentFlagged === flaggedElement) {
            const xpath = getXPath(flaggedElement);
            if (xpath && !flaggedXPaths.includes(xpath)) {
                flaggedXPaths.push(xpath);
            }
        }
    });

    // Print the array of flagged elements' XPaths
    customConsoleWarn("Flagged Elements XPaths:", flaggedXPaths);
}

// Toggle function
window.showHighlights = true;
function toggleHighlight(show) {
    if (flaggedElements.length === 0) {
        flagElements();
    }
    flaggedElements.forEach(flaggedElement => {
        if (show) {
            flaggedElement.classList.add('highlight-flagged');
        } else {
            flaggedElement.classList.remove('highlight-flagged');
        }
    });
}

// Initial flagging when the script first runs
flagElements();