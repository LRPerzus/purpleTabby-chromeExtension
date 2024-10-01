// Global value
let currBatchB64ImagesDict; // this will be removed and added constantly

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'HIGHLIGHT') {
    console.log('HIGHLIGHT message.data', message.data)

    if (message.data !== 'undefined') {
      const framesMissingXpathsDict = message.data
      for (const frameKey in framesMissingXpathsDict) {
        console.log('HIGHLIGHT frameKey', frameKey)
        framesMissingXpathsDict[frameKey].forEach((xpathObject) => {
          const xpath = xpathObject.xpath
          let bodyNode = document.body
          let currentNode = undefined

          if (frameKey !== '') {
            const frameWindowXpathResult = document.evaluate(
              frameKey,
              bodyNode,
              null,
              XPathResult.FIRST_ORDERED_NODE_TYPE,
              null
            )
            const frameWindow = frameWindowXpathResult.singleNodeValue
            if (frameWindow) {
              const frameContentDocument =
                frameWindow.contentDocument ||
                frameWindow.contentWindow.document
              currentNode = document.evaluate(
                xpath,
                frameContentDocument,
                null,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null
              )
            }
          } else {
            currentNode = document.evaluate(
              xpath,
              bodyNode,
              null,
              XPathResult.FIRST_ORDERED_NODE_TYPE,
              null
            )
          }

          const element = currentNode.singleNodeValue

          if (element) {
            const previousStyle = element.getAttribute('purple_tabby_missing')

            if (previousStyle === null) {
              console.log('previous Border:', element.style.border)
              element.setAttribute('purple_tabby_missing', element.style.border)

              // TODO KC: add shadow
              element.style.border = '10px solid purple'
              element.style.boxShadow =
                '5px 5px 10px rgba(0, 0, 0, 0.5), inset 0px 0px 10px rgba(0, 0, 0, 0.8)'
            }
          }
        })
      }
    }
  } else if (message.type === 'START_RESCANNING') {
    chrome.runtime.sendMessage({
      type: 'SCANING_START',
      tabId: message.tabId,
      from:"RESCANNING DUE TO MUTATION"
    });
  } else if (message.type === 'A11YFIXES_Start') {
    console.log('A11YFIXES_Start message.missingXpaths', message.missingXpaths);

    if (message.missingXpaths !== 'undefined') {
        const framesMissingXpathsDict = message.missingXpaths;
        const tabId = message.tabId;
        const elementsFoundInFrame = {};

        for (const frameKey in framesMissingXpathsDict) {
            elementsFoundInFrame[frameKey] = [];
            framesMissingXpathsDict[frameKey].forEach((xpathObject) => {
                const xpath = xpathObject.xpath;
                let bodyNode = document.body;
                let currentNode = undefined;

                if (frameKey !== '') {
                    const frameWindowXpathResult = document.evaluate(
                        frameKey,
                        bodyNode,
                        null,
                        XPathResult.FIRST_ORDERED_NODE_TYPE,
                        null
                    );
                    const frameWindow = frameWindowXpathResult.singleNodeValue;
                    if (frameWindow) {
                        const frameContentDocument = frameWindow.contentDocument || frameWindow.contentWindow.document;
                        currentNode = document.evaluate(
                            xpath,
                            frameContentDocument,
                            null,
                            XPathResult.FIRST_ORDERED_NODE_TYPE,
                            null
                        );
                    }
                } else {
                    currentNode = document.evaluate(
                        xpath,
                        bodyNode,
                        null,
                        XPathResult.FIRST_ORDERED_NODE_TYPE,
                        null
                    );
                }

                const element = currentNode.singleNodeValue;
                if (element) {
                    elementsFoundInFrame[frameKey].push({ xpath: xpath, element: element });
                }
            });
        }

        console.log('A11Y_FIX Screenshots Start');
        console.log('Example', elementsFoundInFrame);
        
        // Once done another for loop
        // GET SCREENSHOT for the current frame
        loadHtml2Canvas()
        .then(async () => {
            // Process frames one by one and ensure all batches are processed before moving to the next frame
            for (const [frame, elementsFoundList] of Object.entries(elementsFoundInFrame)) {
                const splitBatches = splitIntoChunks(elementsFoundList, 10); // Split into chunks of 10

                console.log('splitBatches', splitBatches);

                // Use a for...of loop to iterate over batches in the current frame
                for (const batch of splitBatches) {
                    console.log('Batch', batch);

                    try {
                        // Define an async function to handle the batch processing
                        const handleBatch = async (batch) => {
                            currBatchB64ImagesDict = await captureVisibleElements(batch, frame); // Capture the visible elements
                            console.log('currBatchB64ImagesDict', currBatchB64ImagesDict);

                            // Send message with the screenshots for the current batch
                            await chrome.runtime.sendMessage({
                                type: 'GET_API_ARIALABELS',
                                tabId: tabId,
                                screenshotsFrameDict: currBatchB64ImagesDict,
                            });
                        };

                        // Call the async function and wait for it to complete before moving to the next batch
                        await handleBatch(batch);
                    } catch (error) {
                        console.error('Error capturing screenshots:', error);
                    }
                }
                // All batches for the current frame have been processed before moving to the next frame
            }
        })
        .catch((error) => {
            console.error('Failed to load html2canvas:', error);
        });

    }
  } else if (message.type === 'SET_ARIA_LABELS') {
    console.log('A11YFIXES_Start message.data', message.missingXpaths);

    if (message.missingXpaths !== 'undefined') {
        const framesMissingXpathsDict = message.missingXpaths;
        const promises = []; // Array to hold promises

        for (const frameKey in framesMissingXpathsDict) {
            const xpaths = framesMissingXpathsDict[frameKey];
            console.log("xpaths", xpaths);

            for (const xpath in xpaths) {
                let ariaLabel = (xpaths[xpath]).replace("_negative","");
                let bodyNode = document.body;
                let currentNode = undefined;

                const promise = new Promise((resolve) => {
                    if (frameKey !== '') {
                        const frameWindowXpathResult = document.evaluate(
                            frameKey,
                            bodyNode,
                            null,
                            XPathResult.FIRST_ORDERED_NODE_TYPE,
                            null
                        );
                        const frameWindow = frameWindowXpathResult.singleNodeValue;

                        if (frameWindow) {
                            const frameContentDocument =
                                frameWindow.contentDocument ||
                                frameWindow.contentWindow.document;
                            currentNode = document.evaluate(
                                xpath,
                                frameContentDocument,
                                null,
                                XPathResult.FIRST_ORDERED_NODE_TYPE,
                                null
                            );
                        }
                    } else {
                        currentNode = document.evaluate(
                            xpath,
                            bodyNode,
                            null,
                            XPathResult.FIRST_ORDERED_NODE_TYPE,
                            null
                        );
                    }

                    console.log("LR TESTING currentNode",currentNode);
                    const element = currentNode.singleNodeValue;

                    if (element) {
                        console.log("setAriaLabel", ariaLabel);
                        if (ariaLabel === "") // If both the OCR and the type are _negative set it as could not be found lah
                        {
                          ariaLabel = "Could not be determined";
                        }
                        element.setAttribute("aria-label", ariaLabel);
                    }

                    resolve(); // Resolve the promise once done
                });

                promises.push(promise); // Add promise to the array
            }
        }

        // Wait for all promises to resolve
        Promise.all(promises).then(() => {
            // Send another message to the backend here
            console.log('All aria-labels set. Sending message to backend...');
            chrome.runtime.sendMessage({type: 'HIGHLIGHT_MISSING',tabId:tabId},);
        });
    }
}else if (message.type === 'CHECK_OVERLAY_LISTENERS_JS') {
    sendResponse({ status: 'OVERLAY_LISTENERS_READY' })
  }
})


function splitIntoChunks(array, chunkSize) {
  console.log("splitIntoChunks array",array)
  const result = [];
  for (let i = 0; i < array.length; i += chunkSize) {
      result.push(array.slice(i, i + chunkSize));
  }
  return result;
}