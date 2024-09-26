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
      from: 'popup.js',
    })
  } else if (message.type === 'UPDATE_OVERLAY') {
    // Get the settings from the message
    const settings = message.settings
    const tabId = message.tabId

    if (document.getElementById('tabbeeToggle').checked) {
      let totalLength = 0
      accordionGroup.innerHTML = ''

      for (const [key, array] of Object.entries(message.data.framesDict)) {
        createFrame(key, array)
        totalLength += array.length
      }

      issuesCount.innerHTML = totalLength

      if (accordionGroup.classList.contains('d-none')) {
        accordionGroup.classList.remove('d-none')
      } else {
      }
    }
  }
})

function createFrame(key, array) {
  // Ensure 'key' has a default value
  switch (true) {
    case key === '':
      key = 'MainBody'

      const mainBodyContainer = createKeyTypeGroupHolder(key)
      accordionGroup.appendChild(mainBodyContainer)

      for (let i = 0; i < array.length; i++) {
        const dataToCopy = []
        dataToCopy[i] = JSON.stringify(array[i], null, 2)

        document
          .getElementById(`collapse${key}`)
          .appendChild(createIssueElementsGroupHolder(key, [i]))

        document.getElementById(`elementXPath${key}${[i]}`).innerHTML =
          JSON.stringify(array[i].xpath, null, 2).replace(/"/g, '')

        document.getElementById(`elementHtml${key}${i}`).textContent = array[
          i
        ].code
          .replace(/\n/g, '')
          .replace(/\u00A0/g, '')
          .replace(/\s+/g, ' ')
          .trim()

        hljs.highlightElement(
          document.getElementById(`elementHtml${key}${[i]}`)
        )
        document
          .getElementById(`elementHtml${key}${[i]}`)
          .classList.add('custom-code-wrap')

        document
          .getElementById(`copyButton${key}${i}`)
          .addEventListener('click', async function () {
            // Copy the data to clipboard
            try {
              await navigator.clipboard.writeText(dataToCopy[i])
              document.getElementById(`copyStatus${key}${i}`).innerText =
                'Copied!'

              setTimeout(() => {
                document.getElementById(`copyStatus${key}${i}`).innerText = ''
              }, 2000)
            } catch (error) {
              console.error('Failed to copy text: ', error)
            }
          })
      }

      break

    case key.startsWith('/'):
      key = 'IFrame'

      const iFrameContainer = createKeyTypeGroupHolder(key)
      accordionGroup.appendChild(iFrameContainer)

      for (let i = 0; i < array.length; i++) {
        const dataToCopy = []
        dataToCopy[i] = JSON.stringify(array[i], null, 2)

        document
          .getElementById(`collapse${key}`)
          .appendChild(createIssueElementsGroupHolder(key, [i]))

        document.getElementById(`elementXPath${key}${[i]}`).innerHTML =
          JSON.stringify(array[i].xpath, null, 2).replace(/"/g, '')

        document.getElementById(`elementHtml${key}${i}`).textContent = array[
          i
        ].code
          .replace(/\n/g, '')
          .replace(/\u00A0/g, '')
          .replace(/\s+/g, ' ')
          .trim()

        hljs.highlightElement(
          document.getElementById(`elementHtml${key}${[i]}`)
        )
        document
          .getElementById(`elementHtml${key}${[i]}`)
          .classList.add('custom-code-wrap')

        document
          .getElementById(`copyButton${key}${i}`)
          .addEventListener('click', async function () {
            // Copy the data to clipboard
            try {
              await navigator.clipboard.writeText(dataToCopy[i])
              document.getElementById(`copyStatus${key}${i}`).innerText =
                'Copied!'

              setTimeout(() => {
                document.getElementById(`copyStatus${key}${i}`).innerText = ''
              }, 2000)
            } catch (error) {
              console.error('Failed to copy text: ', error)
            }
          })
      }
      break
  }

  if (issues.classList.contains('d-none')) {
    issues.classList.remove('d-none')
  } else {
    console.log(`issues is ${issues}`)
  }
}

// Creates the UI component for each keyType
function createKeyTypeGroupHolder(keyType) {
  const keyTypeGroupTemplate = `
    <h2 class="accordion-header">
      <button
        class="accordion-button collapsed"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#collapse${keyType}"
        aria-expanded="false"
        aria-controls="collapse${keyType}"
      >
        ${keyType}
      </button>
    </h2>
    <div
      id="collapse${keyType}"
      class="accordion-collapse collapse"
      data-bs-parent="#${keyType}AccordionItem"
    >
    </div>
`

  const keyTypeGroupHolder = Object.assign(document.createElement('div'), {
    id: `${keyType}AccordionItem`,
    className: 'accordion-item ',
    // className: 'accordion-item bg-primary', // devnotes
  })

  keyTypeGroupHolder.innerHTML = keyTypeGroupTemplate

  return keyTypeGroupHolder
}

// Creates the UI component for each issue to be populated in each keyType
function createIssueElementsGroupHolder(keyType, holderUniqueId) {
  const issueElementsGroupTemplate = `
  <div
    class="d-flex justify-content-between align-items-center mb-2"
  >
    <div><p>Element XPath</p></div>
    <div>
      <span id="copyStatus${keyType}${holderUniqueId}" class="mx-2"></span>

      <button
        id="copyButton${keyType}${holderUniqueId}"
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
    <p id="elementXPathHolder${keyType}${holderUniqueId}" class="d-inline-block mw-100 text-break">
      <code id="elementXPath${keyType}${holderUniqueId}" ></code>
    </p>
    <div id="elementHtmlHolder${keyType}${holderUniqueId}" class="border rounded my-3 p-2 bg-grey-100 text-break">
    <pre><code class="html" id="elementHtml${keyType}${holderUniqueId}"></code></pre>

    </div>
  </div>`

  const issueElementsGroupHolder = Object.assign(
    document.createElement('div'),
    {
      id: `issueElementsGroupHolder${keyType}${holderUniqueId}`,
      className: 'accordion-body my-4 mx-3 rounded custom-border',
      // className: 'accordion-body my-4 mx-3 rounded custom-border bg-warning', // devnotes
    }
  )

  issueElementsGroupHolder.innerHTML = issueElementsGroupTemplate

  return issueElementsGroupHolder
}
