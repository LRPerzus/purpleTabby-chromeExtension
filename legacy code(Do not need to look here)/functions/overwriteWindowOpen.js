const originalWindowOpen = window.open;

window.open = function(url, name, features) {
    // Open the new window or tab
    const newWindow = originalWindowOpen.call(window, url, name, features);

    // If the window is successfully opened, send a message to the background script
    if (newWindow) {
        chrome.runtime.sendMessage({
            action: 'injectScript',
            windowId: newWindow.name // Use a unique identifier if needed
        });
    }

    return newWindow;
};
