// Global value
let currBatchB64ImagesDict; // this will be removed and added constantly
let splitBatches;
const limitBatches = 30;
let batchesCount = 0;
let totalBatches = 0;
let finsihedBatches = 0;
let xpath;
let xpaths;
let bodyNode;
let currentNode = undefined
let elementsFoundInFrame



chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'HIGHLIGHT') {
    console.log('HIGHLIGHT message.data', message.data)

    if (message.data !== 'undefined') {
      const framesMissingXpathsDict = message.data.framesDict
      for (const frameKey in framesMissingXpathsDict) {
        console.log('HIGHLIGHT frameKey', frameKey)
        framesMissingXpathsDict[frameKey].forEach((xpathObject) => {
          xpath = getXPathBeforeSVG(xpathObject.xpath)
          bodyNode = document.body
          currentNode = undefined

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
             // TODO KC: add shadow
             element.style.boxShadow = `
             0 0 25px 15px rgba(255, 255, 255, 1),
             0 0 15px 10px rgba(144, 33, 166, 1)`;

             element.style.outline = "4px solid rgba(128, 0, 128, 1)"
          }
        })
      }
    }
  }
  else if (message.type === "REMOVE_HIGHLIGHTS")
  {
    console.log('REMOVE_HIGHLIGHTS message.data', message.data)

    if (message.data !== 'undefined') {
      const framesMissingXpathsDict = message.data.framesDict
      for (const frameKey in framesMissingXpathsDict) {
        console.log('REMOVE_HIGHLIGHTS frameKey', frameKey)
        framesMissingXpathsDict[frameKey].forEach((xpathObject) => {
          xpath = getXPathBeforeSVG(xpathObject.xpath)
          bodyNode = document.body
          currentNode = undefined

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
             // TODO KC: add shadow
             element.style.boxShadow = ``;
             element.style.outline = "";
          }
        })
      }
    }
  }
  else if (message.type === 'A11YFIXES_Start') {
    console.log('A11YFIXES_Start');
    // console.log('A11YFIXES_Start message.missingXpaths', message.missingXpaths);

    if (message.missingXpaths !== 'undefined') {
        console.log("message missingXpaths",message.missingXpaths);
        const framesMissingXpathsDict = message.missingXpaths.framesDict;
        console.log("framesMissingXpathsDict",framesMissingXpathsDict);
        const tabId = message.tabId;
        elementsFoundInFrame = {}; // Reset it
        let frameWindow;
        let element;

        for (const frameKey in framesMissingXpathsDict) {
            elementsFoundInFrame[frameKey] = [];
            framesMissingXpathsDict[frameKey].forEach((xpathObject) => {
                const xpath = (xpathObject.xpath).split("/svg");
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
                    frameWindow = frameWindowXpathResult.singleNodeValue;
                    if (frameWindow) {
                        const frameContentDocument = frameWindow.contentDocument || frameWindow.contentWindow.document;
                        currentNode = document.evaluate(
                            xpath[0],
                            frameContentDocument,
                            null,
                            XPathResult.FIRST_ORDERED_NODE_TYPE,
                            null
                        );
                    }
                } else {
                    currentNode = document.evaluate(
                        xpath[0],
                        bodyNode,
                        null,
                        XPathResult.FIRST_ORDERED_NODE_TYPE,
                        null
                    );
                }

                element = currentNode.singleNodeValue;
                if (xpath.length > 1) // that means there is an svg
                {
                  const position = getSvgIndex(xpath[1]);
                  element = element.querySelectorAll("svg")[position];
                  console.log("TESTING Element SVG",element)
                };

                if (element) {
                  elementsFoundInFrame[frameKey].push({ xpath: xpathObject.xpath, element: element });
                }
            });
        }

        console.log('A11Y_FIX Screenshots Start');
        console.log('Example', elementsFoundInFrame);
        console.log("LIMIT",limitBatches);


        // Once done another for loop
        // GET SCREENSHOT for the current frame
        loadHtml2Canvas()
        .then(async () => {
            // Process frames one by one and ensure all batches are processed before moving to the next frame
            for (const [frame, elementsFoundList] of Object.entries(elementsFoundInFrame)) {

                splitBatches = splitIntoChunks(elementsFoundList, 10); // Split into chunks of 10
                totalBatches += splitBatches.length;

                // Use a for...of loop to iterate over batches in the current frame
                for (const batch of splitBatches) {
                    console.log('Batch', batch);
                    try {
                        // Define an async function to handle the batch processing
                        const handleBatch = async (batch) => {
                            // let before = currBatchB64ImagesDict;
                            currBatchB64ImagesDict = await captureVisibleElements(batch, frame); // Capture the visible elements
                            // check the currentbatch
                            // console.log('Did it change?',!(before === currBatchB64ImagesDict));
                            // delete before;


                            // Send message with the screenshots for the current batch
                            chrome.runtime.sendMessage({
                                type: 'GET_API_ARIALABELS',
                                tabId: tabId,
                                screenshotsFrameDict: currBatchB64ImagesDict,
                            });
                        };

                        // Call the async function and wait for it to complete before moving to the next batch
                        if (batchesCount <= limitBatches)
                        {
                          // console.log("Under stil",batchesCount);
                          batchesCount++;
                          // console.log("now",batchesCount);
                          await handleBatch(batch);
                        }
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
  } 
  else if (message.type === 'SET_ARIA_LABELS') {
    console.log('A11YFIXES_Start message.data', message.missingXpaths);

    if (message.missingXpaths !== 'undefined') {
        const framesMissingXpathsDict = message.missingXpaths;
        const promises = []; // Array to hold promises
        finsihedBatches++;

        for (const frameKey in framesMissingXpathsDict) {
            xpaths = framesMissingXpathsDict[frameKey];
            // console.log("xpaths", xpaths);
            for (let xpath in xpaths) {
                let ariaLabel = (xpaths[xpath]).replace("_negative","");
                let bodyNode = document.body;
                let currentNode = undefined;
                
                xpath = xpath.split("/svg");
                console.log("SET_ARIA_LABELS xpath",xpath);

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
                                xpath[0],
                                frameContentDocument,
                                null,
                                XPathResult.FIRST_ORDERED_NODE_TYPE,
                                null
                            );
                        }
                    } else {
                        currentNode = document.evaluate(
                            xpath[0],
                            bodyNode,
                            null,
                            XPathResult.FIRST_ORDERED_NODE_TYPE,
                            null
                        );
                    }

                    // console.log("LR TESTING currentNode",currentNode);
                    let element = currentNode.singleNodeValue;
                    console.log("EH???? xpath.length",xpath.length);
                    if (xpath.length > 1) // that means there is an svg
                    {
                      console.log("end IS SVG");
                      const position = getSvgIndex(xpath[1]);
                      element = element.querySelectorAll("svg")[position];
                    };
                    // console.log("SET ARIA LABEL element",element);


                    if (element) {
                        // console.log("setAriaLabel", ariaLabel);
                        if (ariaLabel === "") // If both the OCR and the type are _negative set it as could not be found lah
                        {
                          ariaLabel = "clickable element";
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
          console.log('All aria-labels set. Sending message to backend...');
          console.log("totalBatches", totalBatches);
          console.log("finsihedBatches", finsihedBatches);
          
          if (finsihedBatches === totalBatches) {
              console.log("HI Test");
              // Reset finsihedBatches
              finsihedBatches = 0;
              chrome.runtime.sendMessage({ type: 'A11Y_FIXES_COMPLETE', tabId: message.tabId });
          }
      
          // Send messages without expecting any callback
          chrome.runtime.sendMessage({ type: 'CLEAR_arialLabelsFramesDict', tabId: tabId });
          chrome.runtime.sendMessage({ type: 'HIGHLIGHT_MISSING', tabId: tabId });
          
          console.log('Both messages sent.');
      }).catch((error) => {
          console.error("Error in Promise.all:", error);
      });
    }
  } 
  else if (message.type === 'REMOVER_ARIA_LABELS')
  {

  }
  else if (message.type === 'START_RESCANNING') {
  chrome.runtime.sendMessage({
    type: 'SCANING_START',
    tabId: message.tabId,
    from:"RESCANNING DUE TO MUTATION"
  });
  } 
  else if (message.type === 'CHECK_OVERLAY_LISTENERS_JS') {
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

function getXPathBeforeSVG(fullXPath) {
  // Split the XPath by '/' to get individual components
  const xpathParts = fullXPath.split('/');

  // Check if the last part is 'svg'
  const lastPart = xpathParts[xpathParts.length - 1];
  
  if (lastPart.startsWith('svg')) {
      // Remove the last part (which is the SVG)
      xpathParts.pop();
      
      // Join the remaining parts back together to form the XPath before SVG
      return xpathParts.join('/');
  }
  
  // If the last part is not 'svg', return the original XPath
  return fullXPath;
}

function getSvgIndex(xpathSegment) {
  const match = xpathSegment.match(/\[(\d+)\]/);
  return match ? parseInt(match[1], 10) - 1 : 0; // Convert to 0-indexed
}