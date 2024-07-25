// popup.js

document.getElementById("findButton").addEventListener("click", () => {
  const backendDOMNodeId = document.getElementById("backendDOMNodeId").value;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.runtime.sendMessage(
      { action: "findElementById", backendDOMNodeId: backendDOMNodeId },
      (response) => {
        if (response.success) {
          document.getElementById("result").textContent = `Element found with nodeId: ${response.nodeId}`;
        } else {
          document.getElementById("result").textContent = `Error: ${response.error}`;
        }
      }
    );
  });
});
