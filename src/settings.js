let config = {};

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;

        document.querySelectorAll('.tab-btn').forEach(b => {
            b.classList.remove('border-blue-500', 'text-blue-500');
            b.classList.add('border-transparent', 'text-gray-400');
        });

        btn.classList.add('border-blue-500', 'text-blue-500');
        btn.classList.remove('border-transparent', 'text-gray-400');

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });

        document.getElementById(`${tab}-tab`).classList.remove('hidden');
    });
});

// Load configuration
function loadConfig() {
    window.electron.send('get-config');
    window.electron.send('get-paths');
    window.electron.send('list-backups');
}

window.electron.receive('config-data', (data) => {
    config = data;
    updateUI();
});

function updateUI() {
    // General
    document.getElementById('minimizeToTray').checked = config.ui?.minimizeToTray || false;
    document.getElementById('startMinimized').checked = config.ui?.startMinimized || false;
    document.getElementById('maxLogLines').value = config.logs?.maxLines || 100;
    document.getElementById('autoRefresh').checked = config.logs?.autoRefresh || false;

    // Services - Apache
    document.getElementById('apacheAutoStart').checked = config.apache?.autoStart || false;
    document.getElementById('apacheAutoRestart').checked = config.apache?.autoRestart || false;
    document.getElementById('apachePort').value = config.apache?.port || 80;

    // Services - MariaDB
    document.getElementById('mariadbAutoStart').checked = config.mariadb?.autoStart || false;
    document.getElementById('mariadbAutoRestart').checked = config.mariadb?.autoRestart || false;
    document.getElementById('mariadbPort').value = config.mariadb?.port || 3306;
    document.getElementById('mariadbPassword').value = config.mariadb?.password || '';

    // Backups
    document.getElementById('autoBackup').checked = config.backup?.autoBackup || false;
    document.getElementById('maxBackups').value = config.backup?.maxBackups || 10;

    // Advanced - PHP
    document.getElementById('maxUploadSize').value = config.php?.maxUploadSize || '128M';
    document.getElementById('memoryLimit').value = config.php?.memoryLimit || '256M';
}

// Save settings
function saveSettings() {
    const updates = [
        ['ui.minimizeToTray', document.getElementById('minimizeToTray').checked],
        ['ui.startMinimized', document.getElementById('startMinimized').checked],
        ['logs.maxLines', parseInt(document.getElementById('maxLogLines').value)],
        ['logs.autoRefresh', document.getElementById('autoRefresh').checked],
        ['apache.autoStart', document.getElementById('apacheAutoStart').checked],
        ['apache.autoRestart', document.getElementById('apacheAutoRestart').checked],
        ['apache.port', parseInt(document.getElementById('apachePort').value)],
        ['mariadb.autoStart', document.getElementById('mariadbAutoStart').checked],
        ['mariadb.autoRestart', document.getElementById('mariadbAutoRestart').checked],
        ['mariadb.port', parseInt(document.getElementById('mariadbPort').value)],
        ['mariadb.password', document.getElementById('mariadbPassword').value],
        ['backup.autoBackup', document.getElementById('autoBackup').checked],
        ['backup.maxBackups', parseInt(document.getElementById('maxBackups').value)],
        ['php.maxUploadSize', document.getElementById('maxUploadSize').value],
        ['php.memoryLimit', document.getElementById('memoryLimit').value]
    ];

    updates.forEach(([key, value]) => {
        window.electron.send('update-config', key, value);
    });

    showMessage('Paramètres enregistrés avec succès!', 'success');
}

// Reset configuration
function resetConfig() {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser tous les paramètres?')) {
        window.electron.send('reset-config');
        showMessage('Configuration réinitialisée!', 'success');
    }
}

// Toggle password visibility
function togglePassword() {
    const input = document.getElementById('mariadbPassword');
    input.type = input.type === 'password' ? 'text' : 'password';
}

// Backups
window.electron.receive('backups-list', (backups) => {
    const list = document.getElementById('backupsList');

    if (backups.length === 0) {
        list.innerHTML = '<p class="text-gray-400">Aucune sauvegarde disponible</p>';
        return;
    }

    list.innerHTML = backups.map(backup => `
        <div class="flex items-center justify-between bg-gray-700 p-4 rounded">
            <div>
                <p class="font-semibold">${backup.name}</p>
                <p class="text-sm text-gray-400">
                    ${formatDate(backup.created)} - ${formatSize(backup.size)}
                    ${backup.type === 'auto' ? '<span class="text-blue-400">(Auto)</span>' : ''}
                </p>
            </div>
            <div class="flex gap-2">
                <button onclick="restoreBackup('${backup.path}')" class="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700 text-sm">
                    <i class="fas fa-undo mr-1"></i>Restaurer
                </button>
                <button onclick="deleteBackup('${backup.path}')" class="px-3 py-1 bg-red-600 rounded hover:bg-red-700 text-sm">
                    <i class="fas fa-trash mr-1"></i>Supprimer
                </button>
            </div>
        </div>
    `).join('');
});

function createBackup() {
    if (confirm('Créer une nouvelle sauvegarde?')) {
        window.electron.send('create-backup', null, true);
        showMessage('Sauvegarde en cours...', 'info');
    }
}

function restoreBackup(path) {
    if (confirm('Restaurer cette sauvegarde? Les données actuelles seront remplacées.')) {
        window.electron.send('restore-backup', path);
        showMessage('Restauration en cours...', 'info');
    }
}

function deleteBackup(path) {
    if (confirm('Supprimer cette sauvegarde?')) {
        window.electron.send('delete-backup', path);
        showMessage('Sauvegarde supprimée', 'success');
    }
}

window.electron.receive('backup-created', () => {
    showMessage('Sauvegarde créée avec succès!', 'success');
    window.electron.send('list-backups');
});

window.electron.receive('backup-restored', () => {
    showMessage('Sauvegarde restaurée avec succès!', 'success');
});

window.electron.receive('backup-deleted', () => {
    showMessage('Sauvegarde supprimée', 'success');
    window.electron.send('list-backups');
});

window.electron.receive('backup-error', (error) => {
    showMessage('Erreur: ' + error, 'error');
});

// Paths info
window.electron.receive('paths', (paths) => {
    const pathsInfo = document.getElementById('pathsInfo');
    pathsInfo.innerHTML = `
        <p><strong>Dossier des services:</strong> ${paths.base}</p>
        <p><strong>Configuration:</strong> ${paths.config}</p>
        <p><strong>Logs:</strong> ${paths.logs}</p>
        <p><strong>Htdocs:</strong> ${paths.htdocs}</p>
        <p><strong>Sauvegardes:</strong> ${paths.backups}</p>
    `;
});

// Utilities
function formatDate(date) {
    return new Date(date).toLocaleString('fr-FR');
}

function formatSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}

function showMessage(message, type) {
    const statusEl = document.getElementById('statusMessage');
    statusEl.textContent = message;
    statusEl.classList.remove('hidden', 'bg-green-600', 'bg-red-600', 'bg-blue-600');

    if (type === 'success') statusEl.classList.add('bg-green-600');
    else if (type === 'error') statusEl.classList.add('bg-red-600');
    else statusEl.classList.add('bg-blue-600');

    setTimeout(() => statusEl.classList.add('hidden'), 3000);
}

// Initialize
loadConfig();
