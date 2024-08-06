chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "HIGHLIGHT") {
      console.log("message.data",message.data);
      if (message.data !== "undefined") {
        console.log("HEY LOOK UNDEFINED");
        const missingXpaths = message.data;
        missingXpaths.forEach(xpath => {
          const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          const element = result.singleNodeValue;
          console.log("elements",element)

          if (element) {
            element.style.border = "10px solid purple";
          }
        });
      }
    }
  });
  

