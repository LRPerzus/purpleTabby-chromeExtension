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
      type: 'SCANING_START',
      tabId: tab.id,
      status: true,
      from: "EVENT LISTNER"
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

const highlightToggle = document.getElementById('highlightToggle')
highlightToggle.addEventListener('click', async function () {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  let status
  if (highlightToggle.checked) {
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

const makeAccessibleToggle = document.getElementById('makeAccessibleToggle')
makeAccessibleToggle.addEventListener('click', async function () {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  console.log(`Current tab ID: ${tab.id}`)
  let status
  if (makeAccessibleToggle.checked) {
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