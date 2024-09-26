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

// Function to check if the screenshot is blank
function isCanvasBlank(canvas) {
  const context = canvas.getContext('2d');
  const pixelData = context.getImageData(0, 0, canvas.width, canvas.height).data;
  
  // Check for all white or transparent pixels
  for (let i = 0; i < pixelData.length; i += 4) {
      const r = pixelData[i];     // Red channel
      const g = pixelData[i + 1]; // Green channel
      const b = pixelData[i + 2]; // Blue channel
      const a = pixelData[i + 3]; // Alpha channel
      
      // If the pixel is not white (255,255,255) and not fully transparent (a !== 0), return false
      if (!(r === 255 && g === 255 && b === 255 && a === 255) && a !== 0) {
          return false;
      }
  }
  return true; // All pixels are either white or transparent
}

function createBase64FromImage(img) {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  // Get the Base64 string from the canvas
  const base64String = canvas.toDataURL('image/png');

  console.log(base64String); // This will log the Base64 representation of the image
  // You can add further logic here to use the Base64 string
}
  
// Function to capture a screenshot of a specific element
function captureElementScreenshot(element) {
  return new Promise((resolve, reject) => {
    const elementPreviousStyle = element.getAttribute("style");
    element.removeAttribute("style");

    if (window.html2canvas) {
      window.html2canvas(element).then(canvas => {
        const isBlank = isCanvasBlank(canvas);
        // Find the element with `type="image"`
        const imageElement = element.matches('[type="image"]') ? element : element.querySelector('[type="image"]');

        // Check if that element also has a `src` attribute
        const hasTypeImageWithSrc = imageElement && imageElement.hasAttribute('src');        

        let dataUrl;
        if (!isBlank)
        {
          dataUrl = canvas.toDataURL('image/png');
          element.setAttribute("style",elementPreviousStyle);
        }
        else if (imageElement && hasTypeImageWithSrc)//another way to find it has any type images stored in it
        {
          console.log("here?")
          // Get the Base64 representation of the image
          const imgSrc = imageElement.getAttribute('src');
          
          // Create an image object to load the source
          const img = new Image();
          img.src = imgSrc;

          // Create a canvas to draw the image
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);

          // Get the Base64 string from the canvas
          dataUrl  = canvas.toDataURL('image/png');
          
        }
      
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

async function captureVisibleElements(elementsFoundDict) {
  // Dictionary to store screenshots from all frames
  let allResults = {};

  // Loop through each frame in the dictionary
  for (const [frame, elementsFoundList] of Object.entries(elementsFoundDict)) {
    console.log(`Processing frame: ${frame}`);
    
    // Check how many elements are found
    console.log('Found elements for screenshot:', elementsFoundList.length);
    console.log('Concurrency limit:', concurrencyLimit);
    console.log('Element limit:', elementLimit);

    // Limit the number of elements per frame to elementLimit
    const limitedElements = elementsFoundList.slice(0, elementLimit);

    // Function to process elements with concurrency limit
    const processElements = async (elements, limit) => {
      const results = {};
      const executing = [];
      
      for (const { xpath, element } of elements) {
        const p = captureElementScreenshot(element).then(result => {
          const base64Data = result.split(',')[1];
          results[xpath]= base64Data ;  // Store result as an object with xpath and screenshot
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

    // Process elements in the current frame and store them in allResults under the corresponding frame
    const frameResults = await processElements(limitedElements, concurrencyLimit);
    allResults[frame] = frameResults;  // Store the results array for this frame
  }

  return allResults;  // Return the combined results for all frames
}


  

// Chrome extension message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CHECK_SCREENSHOTELEMENT_JS") {
    sendResponse({ status: "SCREENSHOTELEMENT_READY" });
  }
});