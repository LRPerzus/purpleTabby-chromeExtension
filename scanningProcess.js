
let pageListenerResult = "";
console.log("scanning process injected");
  
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "SCAN_COMEPLETE")
    {
        const tab = message.data.tabId;
        // Listener for a new tab opening
        chrome.tabs.onCreated.addListener((tab) => {
            console.log('New tab opened:', tab);
            pageListenerResult = "link"
            // You can perform actions based on the new tab information
        });
        
        // Listener for a tab becoming active
        chrome.tabs.onActivated.addListener((activeInfo) => {
            chrome.tabs.get(activeInfo.tabId, (tab) => {
            console.log('Tab activated:', tab);
            // You can perform actions based on the active tab information
            });
        });
        
        // Listener for changes in a tab's URL
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.url) {
            console.log('Tab URL changed:', changeInfo.url);
            // You can perform actions based on the new URL
            }
        });
        console.log("YAY SCAN COMPLETE");

        // const A11yTree = message.A11yTree;
        // const clickAbleElements = message.clickAbleElements;

        // for (let elementXpath of clickAbleElements)
        // {
        //     try{
        //         let elementHandle = null;

        //         if (elementXpath.includes("svg")) {
        //             elementXpath = elementXpath.split('svg')[0];
        //             if (elementXpath.endsWith("/")) {
        //                 elementXpath = elementXpath.slice(0, -1);
        //             }
        //         }
    
        //         if (elementXpath.includes("/shadowRoot/")) {
        //             const split = elementXpath.split("/shadowRoot/");
        //             const shadowHostXpath = split[0];
        //             const shadowElementXpath = split[1];

        //             // Query for shadow host element
        //             const shadowHostHandle = document.evaluate(shadowHostXpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

        //             if (shadowHostHandle) {
        //                 // Access the shadow root
        //                 const shadowRoot = shadowHostHandle.shadowRoot;

        //                 if (shadowRoot) {
        //                     // Query for the element inside the shadow root
        //                     elementHandle = shadowRoot.querySelector(shadowElementXpath);
        //                 }
        //             }
        //         } else {
        //             // elementHandle = await page.locator(`xpath=${elementXpath}`).elementHandle();
        //         }

        //         if (elementXpath) {
                
        //         }

    


        //     }
        //     catch
        //     {

        //     }
        // }

        
    }
})