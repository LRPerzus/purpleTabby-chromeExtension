let allMissing
let tabId

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  tabId = tabs[0]?.id || request.tabId
})

document.addEventListener('DOMContentLoaded', async () => {
  console.log('Popup opened and script running!')

  // Get the current active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  console.log(`Current tab ID: ${tab.id}`)

  // Send "PlUGIN_CLICKED" message to the background script
  chrome.runtime.sendMessage({ type: 'PlUGIN_CLICKED', tabId: tab.id })
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'POPUP_STATUS') {
    sendResponse({ success: true })
    return true
  } else if (message.type === 'SAVED_SETTINGS') {
    const mapOfIdToKeys = {
      highlight: 'highlightItemsA11yTreeSwitch',
      debuggerAttach: 'debuggerAttach',
      A11yFix: 'a11yFixesSwitch',
    }
    for (const key in message.settings) {
      // Get the corresponding ID from the map
      const elementId = mapOfIdToKeys[key]
      console.log('elementId', elementId)
      if (elementId) {
        const element = document.getElementById(elementId)
        // Perform operations with the element
        if (element.type === 'checkbox') {
          // Set the checkbox state based on messageSetting
          element.checked = message.settings[key]
          console.log(
            `Checkbox with ID ${elementId} set to ${element.checked}.`
          )
        } else {
          console.warn(`Element with ID ${elementId} is not a checkbox.`)
        }
      }
    }
  } else if (message.type === 'PLUGIN_READY') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id || request.tabId
      if (tabId) {
        chrome.runtime.sendMessage({ type: 'OVERLAY_CREATED', tabId: tabId })
        sendResponse({ success: true })
      } else {
        console.error('Unable to get the active tab.')
        sendResponse({ success: false, error: 'Unable to get the active tab.' })
      }
    })
    return true
  } else if (message.type === 'SCANNING_INNIT') {
    chrome.runtime.sendMessage({ type: 'SCANING_START', tabId: tabId })
  } else if (message.type === 'UPDATE_OVERLAY') {
    // Get the settings from the message
    const settings = message.settings
    console.log('settings', settings)
    const tabId = message.tabId
    console.log('All messages sent successfully.')

    // Now that all messages are sent, proceed with the rest of the code
    console.log('HELLO UPDATE_OVERLAY')

    const loadingSpinner = document.getElementById('spinner')
    const highlightButton = document.querySelector(
      '.purpleTabby #highlightItemsA11yTreeSwitch'
    )
    const A11yFixes = document.querySelector('.purpleTabby #a11yFixesSwitch')
    const resultsDiv = document.getElementById('Results')

    if (loadingSpinner && highlightButton) {
      // Hide the spinner
      loadingSpinner.style.display = 'none'

      // Unhide button
      highlightButton.parentElement.style.display = 'block'
      A11yFixes.parentElement.style.display = 'block'

      // Clear everything first
      resultsDiv.innerHTML = `<div class="title"> </h2>`

      // Create content
      const titleDiv = resultsDiv.querySelector('.title')
      const titleSpan = document.createElement('span')
      titleSpan.textContent = `There are ${message.data.missing.length} elements missing from the tree.`
      titleDiv.appendChild(titleSpan)

      // Create copyAll
      const copyAll = document.createElement('button')
      copyAll.textContent = 'Copy All'
      copyAll.addEventListener('click', async function () {
        // Convert the data to a string if necessary
        const dataToCopy = JSON.stringify(message.data.framesDict, null, 2)

        // Copy the data to clipboard
        navigator.clipboard
          .writeText(dataToCopy)
          .then(() => {
            // Change button text to "Copied"
            copyAll.textContent = 'Copied'

            // Revert the text back to "Copy All" after 3 seconds
            setTimeout(() => {
              copyAll.textContent = 'Copy All'
            }, 3000)
          })
          .catch((error) => {
            console.error('Failed to copy text: ', error)
            // Handle error (optional)
          })
      })

      titleDiv.appendChild(copyAll)

      console.log('MISSING DATA', message.data.framesDict)
      for (const [key, array] of Object.entries(message.data.framesDict)) {
        createFrame(key, array)
      }
      resultsDiv.style.display = 'block'
    } else {
      console.error("Element with ID 'treeContent' not found.")
    }
  }
})
function createFrame(key, array) {
  console.log('createFrame key', key)
  console.log('createFrame array', array)

  // Ensure 'key' has a default value
  if (key === '') {
    key = 'main body'
  }

  // Create a unique id for each accordion section
  const uniqueId = `accordion-${key.replace(/\s+/g, '-')}`

  // Create a div with class 'accordion-item'
  const accordionItem = document.createElement('div')
  accordionItem.classList.add('accordion-item')

  // Create the accordion header (key)
  const headerDiv = document.createElement('h2')
  headerDiv.classList.add('accordion-header')
  headerDiv.id = `heading-${uniqueId}`
  headerDiv.innerHTML = `
        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${uniqueId}" aria-expanded="false" aria-controls="collapse-${uniqueId}">
            <span class="frame"> ${key} </span>
            <span class="number"> ${array.length} </span>
        </button>
    `
  accordionItem.appendChild(headerDiv)

  // Create the accordion collapse content (array values)
  const collapseDiv = document.createElement('div')
  collapseDiv.id = `collapse-${uniqueId}`
  collapseDiv.classList.add('accordion-collapse', 'collapse')
  collapseDiv.setAttribute('aria-labelledby', `heading-${uniqueId}`)

  const bodyDiv = document.createElement('div')
  bodyDiv.classList.add('accordion-body')

  // Create a list to hold the array elements
  const list = document.createElement('ul')

  // Populate the list with the array elements
  array.forEach((element) => {
    const listItem = document.createElement('li')
    listItem.textContent = JSON.stringify(element)
    list.appendChild(listItem)
  })

  bodyDiv.appendChild(list)
  collapseDiv.appendChild(bodyDiv)
  accordionItem.appendChild(collapseDiv)

  // Append the accordion item to the accordion container (Results)
  document.getElementById('Results').appendChild(accordionItem)
}
