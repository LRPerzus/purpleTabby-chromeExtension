chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "HIGHLIGHT") {
      console.log("message.data",message.data);

      if (message.data !== "undefined"  ) {
        const missingXpaths = message.data;
        missingXpaths.forEach(xpath => {
          let currentNode = document.body;
          let result;

          // Just in case of FrameSet
          if (document.body.tagName.toLowerCase() === "frameset")
          {
            const frameOrIframeElement = document.body.querySelectorAll('iframe, frame');
            frameOrIframeElement.forEach(frame => {
                currentNode = frame.contentDocument;

                // Evaluate the XPath expression to find the parent node
                result = document.evaluate(xpath, currentNode, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            });
          }
          else
          {
            result = document.evaluate(xpath, currentNode, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          }

          const element = result.singleNodeValue;

          if (element) {
            console.log("previous Border:",element.style.border)
            element.setAttribute("purple_tabby_missing",element.style.border) ;
            element.style.border = "10px solid purple";
          }
        });
      }
    }
    else if (message.type === "START_RESCANNING")
    {
      chrome.runtime.sendMessage({ type: "OVERLAY_CREATED" });
    }
    else if (message.type === "A11YFIXES_Start")
    {
      const missingXpaths = message.missingXpaths;
      console.log("A11YFIXES_Start missingXpaths",missingXpaths);

      missingXpaths.forEach(xpath => {
          // Evaluate the XPath expression to find the element
          const result = document.evaluate(
            xpath, // XPath expression
            document, // Context node (document root)
            null, // Namespace resolver (null if not needed)
            XPathResult.FIRST_ORDERED_NODE_TYPE, // Result type to get the first matching node
            null // Result object (null if not reusing an existing result)
          );

          // Retrieve the element
          const element = result.singleNodeValue;

          if (element) {
            // Set the aria-label attribute
            element.setAttribute('aria-label', 'Clickable element'); // Customize the label as needed
          }
      });
    }
    else if (message.type === "CHECK_OVERLAY_LISTENERS_JS")
    {
      sendResponse({ status: "OVERLAY_LISTENERS_READY" });
    }

});
  

