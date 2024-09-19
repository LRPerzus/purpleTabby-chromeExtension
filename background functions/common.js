import { getFromLocal } from './localStorageFunc.js'
/* 
    Function to set attribute purple_tabby_a11yTree to DOM items via Debugger DOM commands
    Reason: 
        We want to find the direct items from the A11yTree using the backendDomId we can find the node of the DOM.
        Once we find the corresponding node we can set our own unique attribute so that we can extract them directly
    
    Parameters:
        tabId: the tabId you want to affect
        nodeId: the nodeId of which you want to add the attribute
    
    Returns:
        True or False if its been attached (Currently broken)
*/
export async function setAttributeValue(tabId, nodeId, name) {
  console.log('setAttributeValue nodeId', nodeId)

  try {
    // Step 1: Set the attribute
    await new Promise((resolve, reject) => {
      chrome.debugger.sendCommand(
        { tabId },
        'DOM.setAttributeValue',
        {
          nodeId: nodeId,
          name: name,
          value: 'true',
        },
        (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
            return
          }

          resolve(result)
        }
      )
    })
    return true
  } catch (error) {
    if (error.message.includes('Could not find node with given id')) {
      console.warn(
        `Element node id does not exists, attempt to redo nodeId : ${nodeId}`
      )
      return 'redo'
    } else {
      console.error(
        `Failed to set attribute for nodeId ${nodeId}: ${error.message}`
      )
    }
  }
}

/*
    Function that is used after each finished message for A11y Tree and get clickableElements to check if the scan is finished
    It checks if in the local storage stores both A11yTree and clickableElements.
*/
export async function areScansFinished(tabId) {
  let A11yTree = null
  let clickAbleElements = null
  const currentClick = await getFromLocal(tabId, 'noClicks')
  console.log('currentClick', currentClick)
  console.log('tabId', tabId)

  try {
    const foundElements = await getFromLocal(
      tabId,
      'foundElements',
      currentClick
    )
    if (foundElements && foundElements.length > 0) {
      A11yTree = foundElements
      console.log('GET FROM LOCAL A11yTree:', A11yTree)

      // Do something with A11yTree
    } else {
      console.log('foundElements does not exist or is empty')
    }
  } catch (error) {
    console.error('Error retrieving foundElements:', error)
    // A11yTree remains null if there's an error
  }

  // For clickable
  try {
    const clickable = await getFromLocal(
      tabId,
      'clickableElements',
      currentClick
    )
    console.log('GET FROM LOCAL clickableElements', clickable)
    if (clickable && clickable.length > 0) {
      clickAbleElements = clickable
      console.log('clickableElements:', clickAbleElements)
      // Do something with A11yTree
    } else {
      console.log('clickableElements does not exist or is empty')
    }
  } catch (error) {
    console.error('Error retrieving clickableElements:', error)
    // A11yTree remains null if there's an error
  }

  if (A11yTree !== null && clickAbleElements !== null) {
    console.log('YAY ITS ALL DONE')
    const data = {
      clickAbleElements: clickAbleElements,
      A11yTree: A11yTree,
      tabId,
      tabId,
    }
    chrome.tabs.sendMessage(tabId, { type: 'SCAN_COMEPLETE', data: data })
  }
}

export async function doubleCheckNodeId(tabId, backendNodeId) {
  return new Promise((resolve, reject) => {
    chrome.debugger.sendCommand(
      { tabId },
      'DOM.describeNode',
      { backendNodeId: backendNodeId },
      (result) => {
        if (chrome.runtime.lastError) {
          const errorMessage = `Error in doubleCheckNodeId: ${chrome.runtime.lastError.message} (tabId: ${tabId}, backendNodeId: ${backendNodeId})`
          console.log(errorMessage)
          // reject(new Error(errorMessage));
        } else if (!result || !result.node) {
          const errorMessage = `Error in doubleCheckNodeId result || !result.node : No node found (tabId: ${tabId}, backendNodeId: ${backendNodeId})`
          console.log(errorMessage)
          // reject(new Error(errorMessage));
        } else {
          resolve(result.node)
        }
      }
    )
  })
}
