// Function to clear local storage for everything
export function clearLocalStorage() {
    chrome.storage.local.clear(() => {
      if (chrome.runtime.lastError) {
        console.error(`Error clearing local storage: ${chrome.runtime.lastError}`);
      } else {
        console.log("Local storage cleared successfully.");
      }
    });
}

// Function to store data for a specific tab
export async function storeDataForTab(tabId, data, type, noClicked = null) {
    // Create a key specific to the tab
    let key;

    if (noClicked === null) {
        key = `tab_${tabId}_${type}`;
    } else {
        key = `tab_${tabId}_${type}_${noClicked}`;
    }

    try {
        // Store data in chrome.storage.session
        await chrome.storage.session.set({ [key]: data });
        console.log(`Data stored for tab ${tabId} ${type} data: ${data}.`);
    } catch (error) {
        console.error(`Error storing data for tab ${tabId}: ${error}`);
    }
}



/* 
    Function to get the data from local storage 
    Parameters:
        tabId : the tab id
        key: the type of storage you need i.e. clickableElements or A11yTree Elements
        noClicks: I added a possibility to store information on the number of clicks like which click is this
*/

export async function getFromLocal(tabId, key, noclicks = false) {
    // Create a key specific to the tab
    let tabKey;
    if (noclicks !== false) {
        tabKey = `tab_${tabId}_${key}_${noclicks}`;
    } else {
        tabKey = `tab_${tabId}_${key}`;
    }

    try {
        // Get data from chrome.storage.session
        const result = await chrome.storage.session.get(tabKey);
        return result[tabKey];
    } catch (error) {
        console.error(`Error retrieving data for tab ${tabId}: ${error}`);
        throw error;
    }
}
