console.log("getClickableItems Injected");

async function getClickableItems() {
    // Get the XPath of the element
    const getXPath = (element) => {
        try {
            if (!element) return '';
    
            let xPath = '';
            let currentElement = element;
    
            while (currentElement && currentElement.nodeType === Node.ELEMENT_NODE) {
                // Check if the element is an <a> tag with an href attribute
                if (currentElement.tagName.toLowerCase() === 'a' && currentElement.hasAttribute('href')) {
                    return 'skip';
                }
                if (currentElement.classList && currentElement.classList.contains('purpleTabby')) {
                    return 'skip';
                }
    
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
                xPath = `/${tagName}${id}${xPath}`;
    
                // Move to parent element
                if (currentElement.parentNode instanceof ShadowRoot) {
                    const hostElement = currentElement.parentNode.host;
                    xPath = '/shadowRoot' + xPath;
                    currentElement = hostElement;
                } else {
                    currentElement = currentElement.parentNode;
                }
            }
    
            // Make sure to handle the case when the element is the root
            if (xPath.startsWith('/')) {
                xPath = xPath.substring(1); // Remove leading '/'
            }
    
            return xPath || '/';
        } catch (error) {
            console.error('Error in getXPath:', error);
            return '';
        }
    };
    

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

    const clickElements = [];
    try {
        const elements = Array.from(document.querySelectorAll('body *:not(a[href])'));
        elements.forEach(el => {
            try {
                const style = window.getComputedStyle(el);

                if (style.cursor === 'pointer' && isVisible(el)) {
                    if (el.tagName.toLowerCase() === 'a') {
                        if (!el.hasAttribute('href')) {
                            const path = getXPath(el)
                            clickElements.push(path); // Explicit cast to HTMLElement
                        }
                    } else {
                        const path = getXPath(el)
                        if (path !== "skip")
                        {
                            clickElements.push(path); // Explicit cast to HTMLElement
                        }
                    }
                }

                if (el.shadowRoot) {
                    const shadowRootItems = el.shadowRoot.querySelectorAll('*');
                    shadowRootItems.forEach(element => {
                        try {
                            const style = window.getComputedStyle(element);
                            if (style.cursor === 'pointer' && isVisible(element)) {
                                clickElements.push(getXPath(element)); // Explicit cast to HTMLElement
                            }
                        } catch (error) {
                            console.error('Error in shadow root element:', error);
                        }
                    });
                }
            } catch (error) {
                console.error('Error in processing element:', error);
            }
        });
    } catch (error) {
        console.error('Error in querying elements:', error);
    }

    return clickElements;
}