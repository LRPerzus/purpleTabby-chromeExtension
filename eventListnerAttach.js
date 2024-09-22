/* -- Jessie Original --
// Event Listeners
const debuggerAttachSwitch = document.getElementById('debuggerAttach') //tabbeeToggle
debuggerAttachSwitch.addEventListener('click', async function () {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  console.log(`Current tab ID: ${tab.id}`)
  if (debuggerAttachSwitch.checked) {
    console.log('attach it')
    debuggerAttachSwitch.checked = true
    chrome.runtime.sendMessage({
      type: 'DEBUGGER_ATTACH',
      tabId: tab.id,
      status: true,
    })
  } else {
    console.log('dettach it')
    debuggerAttachSwitch.checked = false
    chrome.runtime.sendMessage({
      type: 'DEBUGGER_DETTACH',
      tabId: tab.id,
      status: false,
    })
  }
})

const highlightButton = document.getElementById('highlightItemsA11yTreeSwitch')
highlightButton.addEventListener('click', async function () {
  // Get the current active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  console.log(`Current tab ID: ${tab.id}`)
  let status
  if (highlightButton.checked) {
    status = true
  } else {
    status = false
  }
  chrome.runtime.sendMessage({
    type: 'HIGHLIGHT_MISSING',
    tabId: tab.id,
    status: status,
  })
})

const a11yFix = document.getElementById('a11yFixesSwitch')
a11yFix.addEventListener('click', async function () {
  // Get the current active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  console.log(`Current tab ID: ${tab.id}`)
  let status
  if (a11yFix.checked) {
    status = true
  } else {
    status = false
  }
  chrome.runtime.sendMessage({
    type: 'A11YFIXES_INNIT',
    tabId: tab.id,
    status: status,
  })
})
*/

/*
-- Changes by KC
- Update toggle UI reference
- Add SCANING_START from ELA.js message to start the scanning process
-- 
*/

console.log('eventListnerAttach.js: loaded')

const tabbeeToggle = document.getElementById('tabbeeToggle')
tabbeeToggle.addEventListener('click', async function () {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

  if (tabbeeToggle.checked) {
    console.log(`tabbeeToggle: ${tabbeeToggle.checked} | tabId: ${tab.id}`)
    console.log(`ELA.js: sending TABBEE_TOGGLE_ON message`)
    chrome.runtime.sendMessage({
      type: 'DEBUGGER_ATTACH',
      tabId: tab.id,
      status: true,
    })

    console.log(`ELA.js: sending SCANNING_START message`)
    chrome.runtime.sendMessage({
      type: 'SCANING_START from ELA.js',
      tabId: tab.id,
      status: true,
    })
  } else {
    tabbeeToggle.checked = false
    console.log(`ELA.js: sending TABBEE_TOGGLE_OFF message`)
    chrome.runtime.sendMessage({
      type: 'DEBUGGER_DETTACH',
      tabId: tab.id,
      status: false,
    })
  }
})
