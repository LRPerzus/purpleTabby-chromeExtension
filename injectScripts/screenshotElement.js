// Set variables
let concurrencyLimit = 25;
let elementLimit = 40;

// Function to load html2canvas from the local 'libs' folder
function loadHtml2Canvas() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('../libs/html2canvas.min.js'); // Load from local extension directory
      script.onload = () => {
        console.log('html2canvas script loaded');
        if (window.html2canvas) {
          console.log('html2canvas is available after loading');
          resolve(window.html2canvas);
        } else {
          console.error('html2canvas is not defined after loading');
          reject(new Error('html2canvas is not defined after loading'));
        }
      };
      script.onerror = () => {
        console.error('Failed to load html2canvas script');
        reject(new Error('Failed to load html2canvas script'));
      };
      document.head.appendChild(script);
    });
  }
  
// Function to capture a screenshot of a specific element
function captureElementScreenshot(element) {
  return new Promise((resolve, reject) => {
    if (window.html2canvas) {
      window.html2canvas(element).then(canvas => {
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      }).catch(error => {
        console.error('Error capturing screenshot:', error, "At:", element);
        reject(error);
      });
    } else {
      reject(new Error('html2canvas is not available'));
    }
  });
}
function captureVisibleElements(elementsFoundList) {
  // Convert the elementsFoundList from a dictionary of {xpath: element}
  const elementEntries = Object.entries(elementsFoundList);
  console.log('Found elements for screenshot:', elementEntries.length);
  console.log('Concurrency limit:', concurrencyLimit);
  console.log('Element limit:', elementLimit);
  
  // Limit the number of elements to elementLimit
  const limitedElements = elementEntries.slice(0, elementLimit);

  // Function to process elements with concurrency limit
  const processElements = async (elements, limit) => {
    const results = {};
    const executing = [];
    
    for (const [xpath, element] of elements) {
      const p = captureElementScreenshot(element).then(result => {
        const base64Data = result.split(',')[1];
        results[xpath] = base64Data;  // Store result in dictionary with xpath as the key
      }).catch(error => {
        console.error('Error in captureElementScreenshot:', error);
      }).finally(() => {
        executing.splice(executing.indexOf(p), 1);
      });
      executing.push(p);
      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }
    
    await Promise.all(executing);
    return results;
  };

  return processElements(limitedElements, concurrencyLimit);
}

  

// Chrome extension message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CHECK_SCREENSHOTELEMENT_JS") {
    sendResponse({ status: "SCREENSHOTELEMENT_READY" });
  }
});