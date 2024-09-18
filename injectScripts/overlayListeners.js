chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "HIGHLIGHT") {
      console.log("HIGHLIGHT message.data",message.data);

      if (message.data !== "undefined"  ) {
        const framesMissingXpathsDict = message.data;
        for (const frameKey in framesMissingXpathsDict)
        {
          console.log("HIGHLIGHT frameKey",frameKey);
          framesMissingXpathsDict[frameKey].forEach(xpath => {
            let bodyNode = document.body;
            let currentNode = undefined;

            if (frameKey !== "")
            {
              const frameWindowXpathResult = document.evaluate(frameKey, bodyNode, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
              const frameWindow = frameWindowXpathResult.singleNodeValue;
              if (frameWindow)
              {
                const frameContentDocument = frameWindow.contentDocument || frameWindow.contentWindow.document;
                currentNode = document.evaluate(xpath, frameContentDocument, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
              }
            }
            else
            {
              currentNode = document.evaluate(xpath, bodyNode, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            }
      
            const element = currentNode.singleNodeValue;
  
            if (element) {
              const previousStyle = element.getAttribute("purple_tabby_missing");

              if (previousStyle === null)
              {
                console.log("previous Border:",element.style.border);
                element.setAttribute("purple_tabby_missing",element.style.border) ;
                element.style.border = "10px solid purple";
              }
              
            }
          });
        }
      }
    }
    else if (message.type === "START_RESCANNING")
    {
      chrome.runtime.sendMessage({ type: "OVERLAY_CREATED",tabId: message.tabId});
    }
    else if (message.type === "A11YFIXES_Start")
    {
      const elementsFound = []
      console.log("A11YFIXES_Start message.data",message.missingXpaths);

      if (message.missingXpaths !== "undefined"  ) {
        const framesMissingXpathsDict = message.missingXpaths;

        for (const frameKey in framesMissingXpathsDict)
        {
          // console.log("A11YFIXES_Start frameKey",frameKey);
          framesMissingXpathsDict[frameKey].forEach(xpath => {
            let bodyNode = document.body;
            let currentNode = undefined;

            if (frameKey !== "")
            {
              const frameWindowXpathResult = document.evaluate(frameKey, bodyNode, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
              const frameWindow = frameWindowXpathResult.singleNodeValue;
              if (frameWindow)
              {
                const frameContentDocument = frameWindow.contentDocument || frameWindow.contentWindow.document;
                currentNode = document.evaluate(xpath, frameContentDocument, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
              }
            }
            else
            {
              currentNode = document.evaluate(xpath, bodyNode, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            }
      
            const element = currentNode.singleNodeValue;
  
            if (element) {
              elementsFound.push(element);
            }
          });
        }

        console.log("A11Y_FIX Screenshots Start");
        // GET SCREENSHOT
        loadHtml2Canvas().then(() => {
            captureVisibleElements(elementsFound).then((screenshots) => {
              console.log(screenshots);
            }).catch((error) => {
              console.error('Error capturing screenshots:', error);
            });
          }).catch(error => {
            console.error('Failed to load html2canvas:', error);
          });
      }
    }
    else if (message.type === "CHECK_OVERLAY_LISTENERS_JS")
    {
      sendResponse({ status: "OVERLAY_LISTENERS_READY" });
    }

});
  

