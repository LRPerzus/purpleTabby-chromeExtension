let concurrencyLimit = 10; // must be same as line 133
let elementLimit = 40;
let base64Data;
let frameResults;
let results;

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


// ---------------------------  WORKING ON FIXING THE CNA ---------------------------------------------------------------

// Function to check if background has a url in it either in ::before, ::after, <svg>, or <img>
function doesItHaveURLInBackground(element) {
  // Helper function to check if a style contains a background URL
  function checkBackgroundImage(style) {
    const backgroundImage = style.getPropertyValue('background-image');
    const urlMatch = backgroundImage.match(/url\(["']?(.+?)["']?\)/);
    return urlMatch ? urlMatch[1] : null; // Return the URL or null
  }

  // Helper function to check if an element is <img> and has a src attribute
  function checkImageSrc(el) {
    if (el.tagName.toLowerCase() === 'img') {
      return el.getAttribute('src');
    }
    return null;
  }

  // Helper function to check if an element is <svg> and return the whole SVG code
  function checkSVG(el) {
    if (el.tagName.toLowerCase() === 'svg') {
      return el.outerHTML; // Return the entire SVG markup
    }
    return null;
  }

  // Check the element itself
  const elementStyle = window.getComputedStyle(element);
  let backgroundUrl = checkBackgroundImage(elementStyle);
  if (backgroundUrl) {
    return backgroundUrl;
  }

  // Check if it's an <img> element with a src attribute
  let imageUrl = checkImageSrc(element);
  if (imageUrl) {
    return imageUrl;
  }

  // Check if it's an <svg> element and return its code
  let svgCode = checkSVG(element);
  if (svgCode) {
    return svgCode;
  }

  // Check ::before pseudo-element
  const beforeStyle = window.getComputedStyle(element, '::before');
  backgroundUrl = checkBackgroundImage(beforeStyle);
  if (backgroundUrl) {
    return backgroundUrl;
  }

  // Check ::after pseudo-element
  const afterStyle = window.getComputedStyle(element, '::after');
  backgroundUrl = checkBackgroundImage(afterStyle);
  if (backgroundUrl) {
    return backgroundUrl;
  }

  // Recursively check all children
  const children = element.children;
  for (let i = 0; i < children.length; i++) {
    backgroundUrl = doesItHaveURLInBackground(children[i]);
    if (backgroundUrl) {
      return backgroundUrl;
    }
  }

  // If no URL or SVG found anywhere
  return null;
}


  
// Function to capture a screenshot of a specific element
function captureElementScreenshot(element) {
  return new Promise((resolve) => { // No reject here
    const elementPreviousStyle = element.getAttribute("style");
    element.removeAttribute("style");

    // create a key value key and pair key is the image and the value is the xpath account for src = link inline images and svgs
    const backgroundImgUrl = doesItHaveURLInBackground(element);
    if (backgroundImgUrl) {
      console.log("background", backgroundImgUrl);
    }

    if (window.html2canvas) {
      // Using a try-catch block to catch errors from html2canvas
      try {
        window.html2canvas(element, { useCORS: true, allowTaint: true })
          .then(canvas => {
            const isBlank = isCanvasBlank(canvas);
            // Find the element with `type="image"`
            const imageElement = element.matches('[type="image"]') ? element : element.querySelector('[type="image"]');

            // Check if that element also has a `src` attribute
            const hasTypeImageWithSrc = imageElement && imageElement.hasAttribute('src');        

            let dataUrl = null; // Default to null
            if (!isBlank) {
              dataUrl = canvas.toDataURL('image/png');
            } else if (imageElement && hasTypeImageWithSrc) {
              // Get the Base64 representation of the image
              const imgSrc = imageElement.getAttribute('src');
              const img = new Image();
              img.src = imgSrc;

              // Create a canvas to draw the image
              const imgCanvas = document.createElement('canvas');
              imgCanvas.width = img.width;
              imgCanvas.height = img.height;

              const ctx = imgCanvas.getContext('2d');
              ctx.drawImage(img, 0, 0);

              // Get the Base64 string from the canvas
              dataUrl = imgCanvas.toDataURL('image/png');
            }

            element.setAttribute("style", elementPreviousStyle);
            resolve(dataUrl); // Resolve with the dataUrl or null
          })
          .catch(error => {
            // Handle the error from html2canvas directly
            console.error('Error capturing screenshot:', error.message, "At:", element);
            // You might want to log the entire error object for more details
            console.error(error);
            resolve(null); // Resolve with null on error
          });
      } catch (error) {
        // Handle any synchronous errors that might occur
        console.error('Synchronous error when calling html2canvas:', error.message);
        resolve("error"); // Resolve with null on synchronous error
      }
    } else {
      console.error('html2canvas is not available');
      resolve(null); // Resolve with null if html2canvas is not available
    }
  });
}


async function captureVisibleElements(elementsFoundDict, frameKey) {
  let allResults = {};
  console.log('Found elements for screenshot:', elementsFoundDict.length);
  console.log('Concurrency limit:', concurrencyLimit);
  console.log('Element limit:', elementLimit);

  // Limit the number of elements to elementLimit
  const limitedElements = elementsFoundDict.slice(0, elementLimit);

  // Process elements and store them in allResults
  frameResults = await processElementsInBatches(limitedElements, concurrencyLimit);
  allResults[frameKey] = frameResults;

  return allResults;
}
// Function to process elements in batches
const processElementsInBatches = async (elements, concurrencyLimit) => {
  results = {
    success:{},
    error:{}
  };
  const batch = elements.slice(0, concurrencyLimit); // Only take the first batch
  
  const executing = batch.map(({ xpath, element }) =>
    captureElementScreenshot(element).then(result => {
      if (result !== null) { // if could not capture might add something to fix CNA HERE
        base64Data = result.split(',')[1];
        results.success[xpath] = base64Data;
      }
      else
      {
        results.error[xpath] = "error";
      }
    }).catch(error => {
      console.error('Error in captureElementScreenshot:', error);
    })
  );
  
  await Promise.all(executing);
  return results;
};



// Chrome extension message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CHECK_SCREENSHOTELEMENT_JS") {
    sendResponse({ status: "SCREENSHOTELEMENT_READY" });
  }
});