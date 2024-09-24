let allMissing
let tabId
const accordionGroup = document.getElementById('accordionGroup')
const issues = document.getElementById('issues')
const issuesCount = document.getElementById('issuesCount')
const currentTabUrl = document.getElementById('currentTabUrl')
const tooltipTriggerEl = document.querySelector('[data-bs-toggle="tooltip"]')

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

  const tooltip = new bootstrap.Tooltip(tooltipTriggerEl)

  // Accessibility for tooltip
  tooltipTriggerEl.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      tooltip.show()
    }
  })

  tooltipTriggerEl.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      tooltip.hide()
    }
  })
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'POPUP_STATUS') {
    sendResponse({ success: true })
    return true
  } else if (message.type === 'SAVED_SETTINGS') {
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
    chrome.runtime.sendMessage({
      type: 'SCANING_START',
      tabId: tabId,
      from:"popup.js"
    })
  } else if (message.type === 'UPDATE_OVERLAY') {
    // Get the settings from the message
    const settings = message.settings
    const tabId = message.tabId

    if (document.getElementById('tabbeeToggle').checked) {
      // Reset id="collapseOne" to empty
      document.getElementById('collapseOne').innerHTML = ''
      console.log("LR TETSING message.data.framesDict",message.data.framesDict);
      for (const [key, array] of Object.entries(message.data.framesDict)) {
        console.log("LR TETSING key",key);
        createFrame(key, array)
      }

      if (accordionGroup.classList.contains('d-none')) {
        accordionGroup.classList.remove('d-none')
      } else {
        console.log(`accordionGroup is ${accordionGroup}`)
      }
    }
  }
})

function createFrame(key, array) {
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
      <code id="elementXPath${holderUniqueId}" ></code>
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
