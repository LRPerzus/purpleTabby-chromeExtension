export function addScript(src) {
  const script = document.createElement('script');
  script.id = "popup"
  script.src = chrome.runtime.getURL(src);
  script.type = 'module'; // Ensure the script is treated as a module
  console.log("addScript");
  document.body.appendChild(script);
}
