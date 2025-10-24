// Main renderer script for index.html
let config = {};
let autoScrollEnabled = true;

// Status tracking
const serviceStatus = {
  apache: 'stopped',
  mariadb: 'stopped'
};

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
  // Check for install window elements
  const progressBar = document.getElementById('progress-bar');
  if (progressBar) {
    // This is the install window
    initInstallWindow();
    return;
  }

  // This is the main window
  initMainWindow();
});

// Install window initialization
function initInstallWindow() {
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  const statusContainer = document.getElementById('status-container');
  let steps = [];

  window.electron.receive('install-progress', (progress, message) => {
    if (progressBar) progressBar.style.width = Math.max(progress, 5) + '%';
    if (progressText) progressText.innerText = message;
    if (statusContainer) {
      steps.push({ msg: message, time: new Date().toLocaleTimeString() });
      statusContainer.innerHTML = steps.map(
        step => `<div class="mb-1"><span class="text-gray-400">${step.time}</span> - <span>${step.msg}</span></div>`
      ).join('');
      statusContainer.scrollTop = statusContainer.scrollHeight;
    }
  });

  window.electron.receive('install-error', (err) => {
    if (progressText) progressText.innerText = 'Erreur : ' + err;
    if (statusContainer) {
      steps.push({ msg: 'Erreur : ' + err, time: new Date().toLocaleTimeString() });
      statusContainer.innerHTML = steps.map(
        step => `<div class="mb-1"><span class="text-red-400">${step.time}</span> - <span>${step.msg}</span></div>`
      ).join('');
      statusContainer.scrollTop = statusContainer.scrollHeight;
    }
    if (progressBar) {
      progressBar.classList.remove('bg-blue-600');
      progressBar.classList.add('bg-red-600');
    }
  });
}

// Main window initialization
function initMainWindow() {
  // Load configuration
  window.electron.send('get-config');
  window.electron.send('check-status');

  // Setup event listeners
  setupServiceControls();
  setupQuickActions();
  setupLogControls();
  setupEventHandlers();

  // Auto-refresh status every 5 seconds
  setInterval(() => {
    window.electron.send('check-status');
  }, 5000);
}

// Setup service controls
function setupServiceControls() {
  // Apache controls
  document.getElementById('toggle-apache').addEventListener('click', () => {
    if (serviceStatus.apache === 'running') {
      window.electron.send('stop-apache');
    } else {
      window.electron.send('start-apache');
    }
  });

  document.getElementById('restart-apache').addEventListener('click', () => {
    window.electron.send('restart-apache');
  });

  document.getElementById('logs-apache').addEventListener('click', () => {
    window.electron.send('get-apache-logs');
  });

  // MariaDB controls
  document.getElementById('toggle-mariadb').addEventListener('click', () => {
    if (serviceStatus.mariadb === 'running') {
      window.electron.send('stop-mariadb');
    } else {
      window.electron.send('start-mariadb');
    }
  });

  document.getElementById('restart-mariadb').addEventListener('click', () => {
    window.electron.send('restart-mariadb');
  });

  document.getElementById('logs-mariadb').addEventListener('click', () => {
    window.electron.send('get-mariadb-logs');
  });

  // Copy password button
  document.getElementById('copy-password').addEventListener('click', () => {
    const password = document.getElementById('db-password').textContent;
    navigator.clipboard.writeText(password);
    showInfoBanner('Mot de passe copié dans le presse-papier!');
  });
}

// Setup quick actions
function setupQuickActions() {
  document.getElementById('open-localhost').addEventListener('click', () => {
    window.electron.send('open-external', 'http://localhost');
  });

  document.getElementById('open-phpmyadmin').addEventListener('click', () => {
    window.electron.send('open-external', 'http://localhost/phpmyadmin');
  });

  document.getElementById('open-backup').addEventListener('click', () => {
    if (confirm('Créer une sauvegarde maintenant?')) {
      window.electron.send('create-backup', null, true);
      showInfoBanner('Sauvegarde en cours...');
    }
  });

  document.getElementById('open-settings').addEventListener('click', () => {
    window.electron.send('open-settings');
  });

  document.getElementById('open-htdocs').addEventListener('click', () => {
    window.electron.send('get-paths');
  });

  document.getElementById('view-app-logs').addEventListener('click', () => {
    window.electron.send('get-app-logs');
  });

  document.getElementById('refresh-status').addEventListener('click', () => {
    window.electron.send('check-status');
    showInfoBanner('Statut rafraîchi');
  });
}

// Setup log controls
function setupLogControls() {
  document.getElementById('clear-logs').addEventListener('click', () => {
    document.getElementById('logs-container').innerHTML = '';
  });

  document.getElementById('auto-scroll').addEventListener('click', () => {
    autoScrollEnabled = !autoScrollEnabled;
    const btn = document.getElementById('auto-scroll');
    if (autoScrollEnabled) {
      btn.classList.add('bg-blue-600');
      btn.classList.remove('bg-gray-600');
    } else {
      btn.classList.remove('bg-blue-600');
      btn.classList.add('bg-gray-600');
    }
  });
}

// Setup event handlers from main process
function setupEventHandlers() {
  // Service status updates
  window.electron.receive('service-status', (service, status, message) => {
    serviceStatus[service] = status;
    updateServiceStatus(service, status, message);
  });

  // Service logs
  window.electron.receive('service-logs', (service, logs) => {
    displayLogs(service, logs);
  });

  // App logs
  window.electron.receive('app-logs', (logs) => {
    displayLogs('Application', logs);
  });

  // Service crash notification
  window.electron.receive('service-crash', (service) => {
    showInfoBanner(`Attention: ${service} a crashé et redémarre...`);
  });

  // Configuration data
  window.electron.receive('config-data', (data) => {
    config = data;
    updatePasswordDisplay();
  });

  // Paths
  window.electron.receive('paths', (paths) => {
    // Open htdocs folder in file explorer
    window.electron.send('open-external', 'file:///' + paths.htdocs.replace(/\\/g, '/'));
  });

  // Backup events
  window.electron.receive('backup-created', (backup) => {
    showInfoBanner('Sauvegarde créée avec succès!');
  });

  window.electron.receive('backup-error', (error) => {
    showInfoBanner('Erreur de sauvegarde: ' + error);
  });

  window.electron.receive('backup-progress', (message) => {
    appendLog('Backup', message);
  });
}

// Update service status display
function updateServiceStatus(service, status, message = '') {
  const statusEl = document.getElementById(`${service}-status`);
  const btnTextEl = document.getElementById(`${service}-btn-text`);
  const toggleBtn = document.getElementById(`toggle-${service}`);

  statusEl.className = 'text-sm px-3 py-1 rounded-full';

  if (status === 'running') {
    statusEl.classList.add('bg-green-600', 'text-white', 'animate-pulse');
    statusEl.innerHTML = '<i class="fas fa-circle mr-1"></i>En cours';
    if (btnTextEl) btnTextEl.textContent = 'Arrêter';
    if (toggleBtn) {
      toggleBtn.classList.remove('bg-blue-600', 'hover:bg-blue-500');
      toggleBtn.classList.add('bg-red-600', 'hover:bg-red-500');
      toggleBtn.querySelector('i').className = 'fas fa-stop mr-2';
    }
  } else if (status === 'stopped') {
    statusEl.classList.add('bg-gray-700', 'text-gray-300');
    statusEl.innerHTML = '<i class="fas fa-circle mr-1"></i>Arrêté';
    if (btnTextEl) btnTextEl.textContent = 'Démarrer';
    if (toggleBtn) {
      toggleBtn.classList.remove('bg-red-600', 'hover:bg-red-500');
      toggleBtn.classList.add('bg-blue-600', 'hover:bg-blue-500');
      toggleBtn.querySelector('i').className = 'fas fa-play mr-2';
    }
  } else if (status === 'error') {
    statusEl.classList.add('bg-red-600', 'text-white');
    statusEl.innerHTML = '<i class="fas fa-exclamation-triangle mr-1"></i>Erreur';
    if (message) {
      appendLog(service.charAt(0).toUpperCase() + service.slice(1), 'Erreur: ' + message);
    }
  }
}

// Display logs
function displayLogs(service, logs) {
  const logsContainer = document.getElementById('logs-container');
  const timestamp = new Date().toLocaleTimeString();

  const logEntry = `
    <div class="mb-2 pb-2 border-b border-gray-700">
      <div class="text-blue-400 font-bold">[${timestamp}] ${service}</div>
      <pre class="whitespace-pre-wrap mt-1">${logs || 'Aucun log disponible'}</pre>
    </div>
  `;

  logsContainer.innerHTML += logEntry;

  if (autoScrollEnabled) {
    logsContainer.scrollTop = logsContainer.scrollHeight;
  }
}

// Append single log line
function appendLog(source, message) {
  const logsContainer = document.getElementById('logs-container');
  const timestamp = new Date().toLocaleTimeString();

  const logEntry = `
    <div class="text-gray-400 text-xs">
      <span class="text-blue-400">[${timestamp}]</span>
      <span class="text-green-400">[${source}]</span>
      ${message}
    </div>
  `;

  logsContainer.innerHTML += logEntry;

  if (autoScrollEnabled) {
    logsContainer.scrollTop = logsContainer.scrollHeight;
  }
}

// Update password display
function updatePasswordDisplay() {
  if (config.mariadb?.password) {
    document.getElementById('db-password').textContent = config.mariadb.password;
  }
}

// Show info banner
function showInfoBanner(message) {
  const banner = document.getElementById('info-banner');
  const text = document.getElementById('info-text');

  text.textContent = message;
  banner.classList.remove('hidden');

  setTimeout(() => {
    banner.classList.add('hidden');
  }, 5000);
}
