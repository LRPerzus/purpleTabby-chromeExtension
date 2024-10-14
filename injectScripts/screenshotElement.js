let concurrencyLimit = 10; // must be same as line 133
let elementLimit = 40;
let base64Data;
let frameResults;
let results;
let linkSvgValidityDict = {};

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


// ---------------------------  WORKING ON FIXING THE CNA ---------------------------------------------------------------
// Function to check if background has a URL in it either in ::before, ::after, <svg>, or <img>
async function doesItHaveURLInBackground(element) {
  // Helper function to check if a style contains a background URL
  function checkBackgroundImage(style) {
    const backgroundImage = style.getPropertyValue('background-image');
    const urlMatch = backgroundImage.match(/url\(["']?(.+?)["']?\)/);
    return urlMatch ? { type: 'link', data: urlMatch[1] } : null; // Return object
  }

  // Helper function to check if an element is <img> and has a src attribute
  function checkImageSrc(el) {
    if (el.tagName.toLowerCase() === 'img') {
      return { type: 'link', data: el.getAttribute('src') }; // Return object
    }
    return null;
  }

  // Helper function to fetch the SVG symbol and wrap it in an SVG element
  async function fetchSvgSymbolAndWrapInSvg(href) {
    const [svgUrl, symbolId] = href.split('#');

    try {
      const response = await fetch(svgUrl);
      if (!response.ok) throw new Error(`Failed to fetch SVG: ${response.statusText}`);

      const svgText = await response.text();
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = svgText;

      const symbol = tempDiv.querySelector(`#${symbolId}`);
      if (symbol) {
        const svgWrapper = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svgWrapper.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        svgWrapper.setAttribute("viewBox", "0 0 16 16");
        svgWrapper.setAttribute("width", "16");
        svgWrapper.setAttribute("height", "16");

        const paths = symbol.querySelectorAll('path');
        paths.forEach(path => {
          const clonedPath = path.cloneNode(true);
          svgWrapper.appendChild(clonedPath);
        });

        // const svgString = new XMLSerializer().serializeToString(svgWrapper);
        return { type: 'svg', data: svgWrapper }; // Return object with type 'svg'
      } else {
        console.log(`Symbol with id "${symbolId}" not found`);
        return null;
      }
    } catch (error) {
      console.error('Error fetching SVG symbol:', error);
      return null;
    }
  }

  // Check the element itself
  const elementStyle = window.getComputedStyle(element);
  let backgroundUrl = checkBackgroundImage(elementStyle);
  if (backgroundUrl) {
    return backgroundUrl; // Return the object if found
  }

  // Check if it's an <img> element with a src attribute
  let imageUrl = checkImageSrc(element);
  if (imageUrl) {
    return imageUrl; // Return the object if found
  }

  // Check if it's an <svg> element and fetch the SVG symbol
  if (element.tagName.toLowerCase() === 'svg') {
    const useElements = element.querySelectorAll('use');
    if (useElements.length > 0) {
      for (const useElement of useElements) {
        const href = useElement.getAttribute('xlink:href') || useElement.getAttribute('href');
        if (href) {
          const svgWrappedSymbol = await fetchSvgSymbolAndWrapInSvg(href);
          if (svgWrappedSymbol) {
            return svgWrappedSymbol; // Return the object for SVG
          }
        }
      }
    }
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
    const childBackgroundUrl = await doesItHaveURLInBackground(children[i]);
    if (childBackgroundUrl) {
      return childBackgroundUrl;
    }
  }

  // If no URL or SVG found anywhere
  return null;
}



// Function to convert SVG element to PNG in memory
async function convertSvgElementToPngInMemory(svgElement) {
  try {
    // Get the width and height from the SVG element
    let width = svgElement.getAttribute('width') || svgElement.clientWidth || svgElement.getBBox().width 
    let height = svgElement.getAttribute('height') || svgElement.clientHeight || svgElement.getBBox().height

    // Serialize the SVG element to a string
    const svgData = new XMLSerializer().serializeToString(svgElement);
  
    // Create a data URL for the SVG
    const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData);

    // Create a canvas element
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');

    // Create a new image object in memory
    const img = new Image();

    // Set the crossOrigin attribute if your SVG or any resources inside it are loaded from a different origin
    img.crossOrigin = 'anonymous';

    // Return a Promise that resolves with the PNG data URL
    return await new Promise((resolve, reject) => {
      img.onload = function() {
        // Draw the image onto the canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert the canvas to a PNG data URL
        const pngDataUrl = canvas.toDataURL('image/png');

        // Resolve the Promise with the PNG data URL
        resolve(pngDataUrl);
      };

      img.onerror = function(err) {
        // Reject the Promise if there's an error
        reject(err);
      };

      // Set the source of the image object to the SVG URL
      img.src = svgUrl;
    });
  } catch (error) {
    console.error('Error during SVG to PNG conversion:', error);
    return null;
  }
}

async function fetchImageAsBase64(url) {
  const controller = new AbortController(); // Create an AbortController
  const timeoutId = setTimeout(() => controller.abort(), 1000); // Set a timeout to abort the fetch

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId); // Clear the timeout on successful fetch

    // Check if the response is an image
    const contentType = response.headers.get("Content-Type");
    
    // Handle SVG URLs
    if (contentType && contentType.startsWith("image/svg+xml")) {
      const svgText = await response.text();
      const parser = new DOMParser();
      const svgDocument = parser.parseFromString(svgText, "image/svg+xml");
      const svgElement = svgDocument.documentElement;

      // Convert SVG to PNG and return Base64
      return await convertSvgElementToPngInMemory(svgElement);
    }

    // For other image types (JPEG, PNG, etc.)
    if (!contentType || !contentType.startsWith("image/")) {
      console.error(`Expected image, but received: ${contentType}`);
      return false; // Return false if the content type is not an image
    }

    const blob = await response.blob();
    const reader = new FileReader();
    return new Promise((resolve) => {
      reader.onloadend = () => resolve(reader.result); // Resolve with Base64 string
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error fetching image:', error);
    return false; // Return false if there's an error or timeout
  }
}

// ----------------------------------------------------------------------------------------------------------------



  
// Function to capture a screenshot of a specific element
function captureElementScreenshot(element) {
  return new Promise(async (resolve) => { // No reject here
    const elementPreviousStyle = element.getAttribute("style");
    element.removeAttribute("style");
  
    // Testing to see if the image has a link or an svg inherited in it
    const testingIMG = await doesItHaveURLInBackground(element);
    if (testingIMG){
      console.log("testingIMG", testingIMG);
      // check in the dictionary to reduce speed needed
      if (linkSvgValidityDict[testingIMG.data] === false)
      {
        resolve(null);
      }
      if (testingIMG.type === "svg")
      {
        const png = await convertSvgElementToPngInMemory(testingIMG.data);
        linkSvgValidityDict[testingIMG.data] = true;
        console.log("PNG",png);
        resolve(png);
      }
      else if (testingIMG.type === "link")
      {
        // check if valid link
        const base64Image = await fetchImageAsBase64(testingIMG.data);
        if (base64Image) {
          linkSvgValidityDict[testingIMG.data] = true;
          resolve(base64Image);
        } else {
          linkSvgValidityDict[testingIMG.data] = false;
          resolve(null);
        }
      }
    }
    else if (window.html2canvas) {
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

  console.log("allResults",allResults);
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