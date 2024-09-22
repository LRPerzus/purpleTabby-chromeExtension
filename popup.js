/* -- Jessie's Original Code -- */
/*
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
    // ! KC accordionGroup populated and ready to show
    // ! KC get issues count from here
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
*/

/*
-- Changes by KC
- New UI logic for populating issues via createIssueElementsGroupHolder
- Add global variables for UI, classList add/remove d-none where necessary
-- 
*/

/*
-- TODO
- Toggle show/hide logic for accordionGroup and issuesCount for when scanning is in progress
- Check w Jessie on what key main body and uniqueId var is for
-- 
*/

let allMissing
let tabId
const accordionGroup = document.getElementById('accordionGroup')
const issues = document.getElementById('issues')
const issuesCount = document.getElementById('issuesCount')
const currentTabUrl = document.getElementById('currentTabUrl')

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  tabId = tabs[0]?.id || request.tabId
})

document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  chrome.runtime.sendMessage({ type: 'PlUGIN_CLICKED', tabId: tab.id })

  console.log(
    `popup.js script loaded | current tabId: ${tabId} | current tab.title: ${tab.title} | 'PLUGIN_CLICKED' message sent`
  )

  currentTabUrl.href = tab.url
  currentTabUrl.innerHTML = tab.title
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'POPUP_STATUS') {
    sendResponse({ success: true })
    return true
  } else if (message.type === 'SAVED_SETTINGS') {
    console.log(`popup.js received message.type ${message.type}`)
    const mapOfIdToKeys = {
      highlight: 'highlightToggle',
      debuggerAttach: 'tabbeeToggle',
      A11yFix: 'makeAccessibleToggle',
    }
    for (const key in message.settings) {
      // Get the corresponding ID from the map
      const elementId = mapOfIdToKeys[key]
      // console.log('elementId', elementId)
      if (elementId) {
        const element = document.getElementById(elementId)
        // Perform operations with the element
        if (element.type === 'checkbox') {
          // Set the checkbox state based on messageSetting
          element.checked = message.settings[key]
          // console.log(
          //   `Checkbox with ID ${elementId} set to ${element.checked}.`
          // )
        } else {
          console.warn(`Element with ID ${elementId} is not a checkbox.`)
        }
      }
    }
  } else if (message.type === 'PLUGIN_READY') {
    console.log(`popup.js received message.type ${message.type}`)
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
    console.log(`popup.js received message.type ${message.type}`)
    chrome.runtime.sendMessage({
      type: 'SCANING_START from PU.js',
      tabId: tabId,
    })
  } else if (message.type === 'UPDATE_OVERLAY') {
    console.log(`popup.js received message.type ${message.type}`)

    // Get the settings from the message
    const settings = message.settings
    const tabId = message.tabId

    console.log(
      `${message.type} received successfully | settings is: ${settings} | tabId is: ${tabId}`
    )

    console.log(
      `tabbeeToggle is: ${document.getElementById('tabbeeToggle').checked}`
    )

    if (document.getElementById('tabbeeToggle').checked) {
      console.log(
        `inside if, tabbeeToggle is: ${document.getElementById('tabbeeToggle').checked}`
      )

      // Reset id="collapseOne" to empty
      document.getElementById('collapseOne').innerHTML = ''

      for (const [key, array] of Object.entries(message.data.framesDict)) {
        createFrame(key, array)
      }

      if (accordionGroup.classList.contains('d-none')) {
        accordionGroup.classList.remove('d-none')
      } else {
        console.log(`accordionGroup is ${accordionGroup}`)
      }
    }

    console.log(`Line 346: ${message.type} end of script`)
  }
})

function createFrame(key, array) {
  console.log(`createFrame function called`)

  // Ensure 'key' has a default value
  if (key === '') {
    key = 'main body'
  }

  issuesCount.innerHTML = array.length

  if (issues.classList.contains('d-none')) {
    issues.classList.remove('d-none')
  } else {
    console.log(`issues is ${issues}`)
  }

  // Create a unique id for each accordion section
  // const uniqueId = `accordion-${key.replace(/\s+/g, '-')}`

  for (let i = 0; i < array.length; i++) {
    const dataToCopy = []
    dataToCopy[i] = JSON.stringify(array[i], null, 2)

    document
      .getElementById('collapseOne')
      .appendChild(createIssueElementsGroupHolder([i]))

    document.getElementById(`elementXPath${[i]}`).innerHTML = JSON.stringify(
      array[i].xpath,
      null,
      2
    ).replace(/"/g, '')

    document.getElementById(`elementHtml${i}`).textContent = array[i].code
      .replace(/\n/g, '')
      .replace(/\u00A0/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    hljs.highlightElement(document.getElementById(`elementHtml${[i]}`))
    document
      .getElementById(`elementHtml${[i]}`)
      .classList.add('custom-code-wrap')

    document
      .getElementById(`copyButton${i}`)
      .addEventListener('click', async function () {
        // Copy the data to clipboard
        try {
          await navigator.clipboard.writeText(dataToCopy[i])
          document.getElementById(`copyStatus${i}`).innerText = 'Copied!'

          setTimeout(() => {
            document.getElementById(`copyStatus${i}`).innerText = ''
          }, 2000)
        } catch (error) {
          console.error('Failed to copy text: ', error)
        }
      })
  }
}

// Creates the UI component for each issue
function createIssueElementsGroupHolder(holderUniqueId) {
  const issueElementsGroupTemplate = `
  <div
    class="d-flex justify-content-between align-items-center mb-2"
  >
    <div><p>Element XPath</p></div>
    <div>
      <span id="copyStatus${holderUniqueId}" class="mx-2"></span>

      <button
        id="copyButton${holderUniqueId}"
        class="border border-1 rounded bg-grey-100 copy-icon"
        aria-label="Copy file icon"
      >
        <img
          src="assets/files.svg"
          width="24"
          height="24"
          alt="File Icon"
        />
      </button>
    </div>
  </div>
  <div class="mw-100">
    <p id="elementXPathHolder${holderUniqueId}" class="d-inline-block mw-100 text-break">
      <code id="elementXPath${holderUniqueId}" class="custom-code-wrap"></code>
    </p>
    <div id="elementHtmlHolder${holderUniqueId}" class="border rounded my-3 p-2 bg-grey-100 text-break">
    <pre><code class="html" id="elementHtml${holderUniqueId}"></code></pre>

    </div>
  </div>`

  const issueElementsGroupHolder = Object.assign(
    document.createElement('div'),
    {
      id: `issueElementsGroupHolder${holderUniqueId}`,
      className: 'accordion-body my-4 mx-3 rounded custom-border',
    }
  )

  issueElementsGroupHolder.innerHTML = issueElementsGroupTemplate

  return issueElementsGroupHolder
}
