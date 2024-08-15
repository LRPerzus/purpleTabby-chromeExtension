console.log("getClickableItems Injected");

async function getClickableItems() {
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