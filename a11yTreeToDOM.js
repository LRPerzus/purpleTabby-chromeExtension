console.log("a11yTreeToDOM script loaded");


function getChildIndex(childString) {
    let match = childString.match(/children\[(\d+)\]/);
    if (match) {
        return parseInt(match[1], 10);
    } else {
        throw new Error("Invalid child string format");
    }
}

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



function a11yTreeToDOM(notEmptyNamesXapths)
{
    // Set variables
    const skipTags = ["script", "iframe", "style", "noscript"];
    const elementsFound = [];

    notEmptyNamesXapths.forEach(node => {
        const nodeXpath = node.xpath;
        const nodeXpathSplit = nodeXpath ? nodeXpath.split(".") : [];
        const xpaths = nodeXpathSplit.slice(3); // we need to split the first 3 because the first 2 are the html tag and body tag
    
        if (xpaths && xpaths.length !== 0) {
            console.log("Whole Xpath", xpaths.length, nodeXpath);
            let element = document.body;
            let traveresedPath = ".children[0].children[0]";
            let xpathsTraverseIndex = 0;
    
            xpaths.forEach(path => {
                // Now we continue the whole string until we reach an error
                try {
                    let childIndex = getChildIndex(path);
                    let previous = element;
                    let indexOfChild = 0;
                    let changesChildIndex = childIndex;
                    let childrenOfElement;
    
                    // Exception for shadowroot
                    if (element.shadowRoot) {
                        console.log("SHADOWROOT");
                        childrenOfElement = element.shadowRoot.children;
                    } else {
                        childrenOfElement = element.children;
                    }
    
                    let child = childrenOfElement[indexOfChild];
                    let style = child.getBoundingClientRect();
                    let visibale = (style.width === 0 && style.height === 0);
                    let end = false;
                    console.log("Current Xpaths", path);
    
                    let missingDiv = element;
    
                    // Iterate over each child to change the number due to accessibility tree sometimes adding and removing other divs
                    while ((missingDiv === element || skipTags.includes(child.tagName.toLowerCase()) || visibale) && end === false && indexOfChild <= childrenOfElement.length - 1) {
                        // If right off the bat the childIndex is larger than indexOfchild
                        // It prunes off divs in div if the outer div only has 1 inner div.
                        if (indexOfChild === 0 && childrenOfElement.length - 1 < childIndex) {
                            console.log("The tree has skipped a div(this can happen sometimes)");
                            missingDiv = child;
                        }
    
                        child = childrenOfElement[indexOfChild];
                        style = child.getBoundingClientRect();
                        visibale = (style.width === 0 && style.height === 0);
                        let isItNone = window.getComputedStyle(child).display === "none";
                        console.log("Hey visbale?:", visibale);
                        console.log("Current section of the Xpath", element);
                        console.log("Looking into", child);
                        console.log("indexOfChild >= changesChildIndex", indexOfChild >= changesChildIndex);
                        console.log("indexOfChild", indexOfChild);
                        console.log("changesChildIndex", changesChildIndex);
                        console.log("isItNone", isItNone);
    
                        // Check if the child's tag name is in the list of tag names
                        if (skipTags.includes(child.tagName.toLowerCase()) && indexOfChild >= childIndex) {
                            // Check if the index of this child is less than the specified childIndex
                            console.log("In skiptags array");
                            if (changesChildIndex + 1 <= childrenOfElement.length - 1) {
                                changesChildIndex++;
                            }
                        } else if (child.shadowRoot) {
                            end = true;
                        } else if (child.hasAttribute("rel")) {
                            if (child.getAttribute("rel").toLowerCase() === "stylesheet") { // Some links are stylesheets
                                changesChildIndex++;
                            }
                        } else if ((visibale && child.shadowRoot) || window.getComputedStyle(child).display === "none") {
                            changesChildIndex++;
                        } else if (xpathsTraverseIndex + 1 !== xpaths.length && child.innerHTML.trim() === "" && child.tagName.toLowerCase() !== "hr") {
                            console.log("Empty innerHTML");
                            changesChildIndex++;
                        } else if (child !== null && child !== undefined && (indexOfChild >= changesChildIndex)) { // If it passes all conditions
                            end = true;
                        }
    
                        if (!end) {
                            indexOfChild++;
                        }
                    }
                    console.log("MANAGED TO GET TO HERE");
    
                    if (element.shadowRoot) {
                        element = element.shadowRoot.children[changesChildIndex];
                    } else {
                        console.log("no shadowRoot", changesChildIndex);
                        console.log("element.children", element.children);
                        if (missingDiv !== element) {
                            element = missingDiv;
                        }
                        console.log("After while loop indexOfChild", indexOfChild);
                        if (changesChildIndex === indexOfChild) {
                            if (changesChildIndex > childrenOfElement.length - 1) { // Goes out of the index length
                                changesChildIndex = childIndex;
                            }
                        }
    
                        element = element.children[changesChildIndex];
                    }
    
                    if (element === undefined) {
                        console.log("HEY element is undefined");
                        element = previous;
                    }
                    traveresedPath += `.children[${changesChildIndex}]`;
                    xpathsTraverseIndex++;
                } catch (error) {
                    console.log("Undefined error probably");
                }
            });
    
            console.log("element", element);
            if (element !== undefined) {
                console.log("pushing", elementsFound.length);
                const xpath = getXPath(element);
    
                elementsFound.push(xpath);
            }
    
            // Now that I have the element I can place them into a JSON then I can output them
            // Do I use the repeated code from what I had?
            console.log("elementsFound",elementsFound)
        }
    });
    return elementsFound;

}