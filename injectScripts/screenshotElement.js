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
  
  
  // Function to capture screenshots of up to x visible elements
  function captureVisibleElements(elementsFoundList) {    
    return Promise.all(elementsFoundList.map(el => captureElementScreenshot(el)));
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
  