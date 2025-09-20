window.addEventListener('DOMContentLoaded', () => {
  const progressBar = document.getElementById('progress-bar')
  const progressText = document.getElementById('progress-text')
  const statusContainer = document.getElementById('status-container')
  let steps = []

  if (window.electron) {
    window.electron.receive('install-progress', (progress, message) => {
      if (progressBar) progressBar.style.width = Math.max(progress, 5) + '%'
      if (progressText) progressText.innerText = message
      if (statusContainer) {
        steps.push({ msg: message, time: new Date().toLocaleTimeString() })
        statusContainer.innerHTML = steps.map(
          step => `<div class="mb-1"><span class="text-gray-400">${step.time}</span> - <span>${step.msg}</span></div>`
        ).join('')
        statusContainer.scrollTop = statusContainer.scrollHeight
      }
    })
    window.electron.receive('install-error', (err) => {
      if (progressText) progressText.innerText = 'Erreur : ' + err
      if (statusContainer) {
        steps.push({ msg: 'Erreur : ' + err, time: new Date().toLocaleTimeString() })
        statusContainer.innerHTML = steps.map(
          step => `<div class="mb-1"><span class="text-red-400">${step.time}</span> - <span>${step.msg}</span></div>`
        ).join('')
        statusContainer.scrollTop = statusContainer.scrollHeight
      }
      progressBar.classList.remove('bg-blue-600')
      progressBar.classList.add('bg-red-600')
    })
  }
})