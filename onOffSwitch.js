// Function to execute after the document has fully loaded
const setupButton = () => {
    // Create the button element
    const onOFF = document.createElement('button');
    onOFF.id = 'highlightItemsA11yTree';
    onOFF.setAttribute("status", "off");
    onOFF.textContent = 'ON OR OFF';

    // Add event listener to the button
    onOFF.addEventListener('click', () => {
        // Ensure the chrome runtime is available
        if (chrome.runtime && chrome.runtime.sendMessage) {
            const status = onOFF.getAttribute("status");
            if (status === "off") {
                onOFF.setAttribute("status", "on");
                chrome.runtime.sendMessage({ type: "ON_OFF", on: true });
            } else {
                onOFF.setAttribute("status", "off");
                chrome.runtime.sendMessage({ type: "ON_OFF", on: false });
            }
        } else {
            console.error("Extension context invalidated or runtime not available.");
        }
    });

    // Append the button to the body
    document.body.appendChild(onOFF);
};

// Wait for the document to fully load
if (document.readyState === 'loading') {
    // The document is still loading, so wait for DOMContentLoaded
    document.addEventListener('DOMContentLoaded', setupButton);
} else {
    // The document is already loaded
    setupButton();
}
