chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "HIGHLIGHT") {
      console.log("message.data",message.data);

      if (message.data !== "undefined"  ) {
        const missingXpaths = message.data;
        missingXpaths.forEach(xpath => {
          const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          const element = result.singleNodeValue;
          console.log("elements",element)

          if (element) {
            element.classList.add("purple_Tabby_Missing");
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
});
  

