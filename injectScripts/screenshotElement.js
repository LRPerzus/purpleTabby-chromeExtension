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
  return Promise.all(elementsFoundList.map(el => captureElementScreenshot(el)));
}

  // Function to capture screenshots of up to x visible elements with concurrency limit
function captureVisibleElements(elementsFoundList) {
  const elements = Array.from(elementsFoundList);
  console.log('Found elements for screenshot:', elements.length);
  console.log('Concurrency limit:', concurrencyLimit);
  console.log('Element limit:', elementLimit);
  
  // Limit the number of elements to elementLimit
  const limitedElements = elements.slice(0, elementLimit);

  // Function to process elements with concurrency limit
  const processElements = async (elements, limit) => {
    const results = [];
    const executing = [];
    for (const element of elements) {
      const p = captureElementScreenshot(element).then(result => {
        results.push(result);
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
  
  
  // Listen for messages from popup.js
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'CAPTURE_SCREENSHOTS') {
      loadHtml2Canvas().then(() => {
        captureVisibleElements().then((screenshots) => {
          sendResponse({ screenshots });
        }).catch((error) => {
          console.error('Error capturing screenshots:', error);
          sendResponse({ screenshots: [] });
        });
      }).catch(error => {
        console.error('Failed to load html2canvas:', error);
        sendResponse({ screenshots: [] });
      });
  
      // Keep the message channel open for asynchronous response
      return true;
    }
  });
  