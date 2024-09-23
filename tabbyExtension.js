function displayCodeAsString() {
  const codeElement = document.getElementById('code-snippet')

  const codeContent = codeElement.innerHTML

  const escapedCode = codeContent
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

  codeElement.innerHTML = escapedCode
}
displayCodeAsString()
