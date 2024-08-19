function createOverlay() {
    // Create the overlay container
    const overlayContainer = document.createElement('div');
    overlayContainer.className = "purpleTabby"
    overlayContainer.id = 'overlay-container';
    overlayContainer.style.position = 'fixed';
    overlayContainer.style.top = '50px'; // Adjust as needed
    overlayContainer.style.right = '10px'; // Position on the right side
    overlayContainer.style.width = '300px'; // Adjust width as needed
    overlayContainer.style.height = '400px'; // Adjust height as needed
    overlayContainer.style.backgroundColor = 'white';
    overlayContainer.style.color = 'black';
    overlayContainer.style.border = '1px solid black';
    overlayContainer.style.borderRadius = '8px';
    overlayContainer.style.zIndex = '10000';
    overlayContainer.style.overflow = 'auto';
    overlayContainer.style.resize = 'both'; // Allow resizing

    // Make overlay movable
    overlayContainer.style.cursor = 'move';

    // Create the content box
    const contentBox = document.createElement('div');
    contentBox.id = 'content';
    contentBox.style.position = 'relative';
    contentBox.style.height = '100%';
    contentBox.style.width = '100%';
    contentBox.style.padding = '10px';

    // Create the close button
    const closeButton = document.createElement('button');
    closeButton.id = 'close-button';
    closeButton.textContent = 'Close';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '10px';
    closeButton.style.right = '10px';
    closeButton.style.backgroundColor = 'red';
    closeButton.style.color = 'white';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '4px';
    closeButton.style.padding = '5px 10px';
    closeButton.style.cursor = 'pointer';

    // Append the close button to the content box
    contentBox.appendChild(closeButton);

    // Add header and other elements
    const header = document.createElement('h1');
    header.textContent = 'Accessibility Tree';
    contentBox.appendChild(header);

    const highlightButton = document.createElement('button');
    highlightButton.id = 'highlightItemsA11yTree';
    highlightButton.textContent = 'Highlight Items (A11y Tree)';
    highlightButton.style.display = 'none'; // Add hidden style
    contentBox.appendChild(highlightButton);


    const rescanButton = document.createElement('button');
    rescanButton.textContent = 'Rescan';
    rescanButton.style.display = 'none'; // Add hidden style
    rescanButton.id = 'rescanButton';
    contentBox.appendChild(rescanButton);


    const A11yFixes = document.createElement('button');
    A11yFixes.textContent = 'A11yFixes';
    A11yFixes.style.display = 'none'; // Add hidden style
    A11yFixes.id = 'A11yFixes';
    contentBox.appendChild(A11yFixes);

    const treeContent = document.createElement('textarea');
    // Set the width and height
    treeContent.style.width = '300px';
    treeContent.style.height = '200px';
    
    treeContent.id = 'treeContent';
    treeContent.textContent = 'Loading...';
    contentBox.appendChild(treeContent);

    // Append the content box to the overlay container
    overlayContainer.appendChild(contentBox);

    // Append the overlay container to the body
    let currentNode = document.body
    if (document.body) {
        // The <body> element exists
        if ( document.body.nodeName.toLowerCase() === 'frameset') {
             // if currentNode is a <frameset>
              // Move the variable outside the frameset then appendChild the component
              while (currentNode.nodeName.toLowerCase()=== 'frameset' ) {
                currentNode = currentNode.parentElement
              }
              currentNode.appendChild(overlayContainer);
        }
        else {
            // currentNode is a <body>
            currentNode.appendChild(overlayContainer);
          }
    }
    else if (document.head) {
        document.head.insertAdjacentElement('afterend', overlayContainer);
    }
    else {
        // Neither <body> nor <head> nor <html> exists
        // Append the variable to the document
        document.documentElement.appendChild(overlayContainer);
    }
    // Add event listener
    closeButton.addEventListener('click', () => {
        document.getElementById('overlay-container').remove();
    });

    highlightButton.addEventListener('click', () => {
        // See if this is closing
        const itemsMissing = document.querySelectorAll(".purple_Tabby_Missing");
        if (itemsMissing.length > 0)
        {
            console.log("Already Highlighted Removing")
            itemsMissing.forEach(item => {
                item.classList.remove("purple_Tabby_Missing");
              });
        }
        else if (chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({ type: "HIGHLIGHT_MISSING"});
        }
    });

    rescanButton.addEventListener('click', function() {
        treeContent.value = ""; // Clear the textarea content
        chrome.runtime.sendMessage({ type: "RESCAN_INNIT" });
    });

    A11yFixes.addEventListener('click', function() {
        chrome.runtime.sendMessage({ type: "A11YFIXES_INNIT" });
    });


    // Make the overlay movable
    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    overlayContainer.addEventListener('mousedown', (event) => {
        isDragging = true;
        offsetX = event.clientX - overlayContainer.getBoundingClientRect().left;
        offsetY = event.clientY - overlayContainer.getBoundingClientRect().top;
        overlayContainer.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (event) => {
        if (isDragging) {
            const left = event.clientX - offsetX;
            const top = event.clientY - offsetY;
            overlayContainer.style.left = `${left}px`;
            overlayContainer.style.top = `${top}px`;
        }
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            overlayContainer.style.cursor = 'move';
        }
    });

    overlayContainer.ondragstart = () => false;
}

// Inject the overlay when the script is executed
if (!document.getElementById("overlay-container"))
{
    createOverlay();
    chrome.runtime.sendMessage({ type: "OVERLAY_CREATED" });
}
