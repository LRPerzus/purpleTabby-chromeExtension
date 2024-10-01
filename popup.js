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
    console.log("UPDATEOVERLAY");
    // Get the settings from the message
    const settings = message.settings
    const tabId = message.tabId

    if (document.getElementById('tabbeeToggle').checked) {
      let totalLength = 0
      accordionGroup.innerHTML = ''

      totalLength = message.data.missing.length
      issuesCount.innerHTML = totalLength

      const prettyPrintFramesDict = (framesDictData) => {
        // Iterate over the entries of the library object
        return Object.entries(framesDictData).map(([key, value]) => {
          const newKey =
            key === '' ? 'mainBody' : key.startsWith('/') ? 'iFrame' : 'unknown'

          // Create a new structure for each entry
          const newValue = value.map((item) => ({
            keyType:
              key === ''
                ? 'main body'
                : key.startsWith('/')
                ? `iFrame_${key}`
                : 'unknown',
            xpath: item.xpath,
            code: item.code,
          }))
          return [newKey, newValue]
        })
      }

      const issueElementsUIData = prettyPrintFramesDict(message.data.framesDict)

      createFrame(issueElementsUIData)

      if (
        accordionGroup.classList.contains('d-none') &&
        issues.classList.contains('d-none')
      ) {
        accordionGroup.classList.remove('d-none')
        issues.classList.remove('d-none')
      } else {
        console.log('accordionGroup and issues are already visible.')
      }
    }
  }
})

function createFrame(data) {
  for (let i = 0; i < data.length; i++) {
    const [key, entries] = data[i] // Destructure to get the key and entries array
    console.log(`data[i] is: ${data[i]}`)
    const keyTypeContainers = createKeyTypeGroupHolder(key + [i])
    accordionGroup.appendChild(keyTypeContainers)
    for (let j = 0; j < entries.length; j++) {
      const dataToCopy = []
      dataToCopy[j] = JSON.stringify(entries[j], null, 2)
      document
        .getElementById(`collapse${key + [i]}`)
        .appendChild(createIssueElementsGroupHolder(key + [i], [j]))
      document.getElementById(`elementXPath${key}${[i]}${[j]}`).innerHTML =
        JSON.stringify(entries[j].xpath, null, 2).replace(/"/g, '')
      document.getElementById(`elementHtml${key}${[i]}${[j]}`).textContent =
        entries[j].code
          .replace(/\n/g, '')
          .replace(/\u00A0/g, '')
          .replace(/\s+/g, ' ')
          .trim()
      hljs.highlightElement(
        document.getElementById(`elementHtml${key}${[i]}${[j]}`)
      )
      document
        .getElementById(`elementHtml${key}${[i]}${[j]}`)
        .classList.add('custom-code-wrap')
      document
        .getElementById(`copyButton${key}${[i]}${[j]}`)
        .addEventListener('click', async function () {
          // Copy the data to clipboard
          try {
            await navigator.clipboard.writeText(dataToCopy[j])
            document.getElementById(`copyStatus${key}${[i]}${[j]}`).innerText =
              'Copied!'
            setTimeout(() => {
              document.getElementById(
                `copyStatus${key}${[i]}${[j]}`
              ).innerText = ''
            }, 2000)
          } catch (error) {
            console.error('Failed to copy text: ', error)
          }
        })
    }
  }
} (edited) 

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
function createIssueElementsGroupHolder(keyType, entriesIndex) {
  const issueElementsGroupTemplate = `
  <div
    class="d-flex justify-content-between align-items-center mb-2"
  >
    <div><p>Element XPath</p></div>
    <div>
      <span id="copyStatus${keyType}${entriesIndex}" class="mx-2"></span>

      <button
        id="copyButton${keyType}${entriesIndex}"
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
    <p id="elementXPathHolder${keyType}${entriesIndex}" class="d-inline-block mw-100 text-break">
      <code id="elementXPath${keyType}${entriesIndex}" ></code>
    </p>
    <div id="elementHtmlHolder${keyType}${entriesIndex}" class="border rounded my-3 p-2 bg-grey-100 text-break">
    <pre><code class="html" id="elementHtml${keyType}${entriesIndex}"></code></pre>

    </div>
  </div>`

  const issueElementsGroupHolder = Object.assign(
    document.createElement('div'),
    {
      id: `issueElementsGroupHolder${keyType}${entriesIndex}`,
      className: 'accordion-body my-4 mx-3 rounded custom-border',
      // className: 'accordion-body my-4 mx-3 rounded custom-border bg-warning', // devnotes
    }
  )

  issueElementsGroupHolder.innerHTML = issueElementsGroupTemplate

  return issueElementsGroupHolder
}
