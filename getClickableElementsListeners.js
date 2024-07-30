// Notify background script when getClickable is ready
chrome.runtime.sendMessage({ type: "GET_CLICKABLE_READY" });

// Your getClickable code
console.log("Listeners Set");
function isClickable(element) {
    const style = window.getComputedStyle(element);
    return style.pointerEvents === 'auto' && style.cursor !== 'default';
  }
  
  // Use a CSS selector to find elements that are likely clickable
  function getClickableElements() {
    // Select elements with potential for pointer events (this is a broad selection)
    const potentialElements = document.querySelectorAll('*:not([style*="pointer-events: none"])');
    
    // Further filter these elements using JavaScript
    return Array.from(potentialElements).filter(isClickable);
  }
  
  // Send the list of clickable elements to the background script
  chrome.runtime.sendMessage({
    type: 'CLICKABLE_ELEMENTS',
    data: getClickableElements().map(el => el.outerHTML)
  });