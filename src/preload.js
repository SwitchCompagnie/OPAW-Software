const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  send: (channel, ...args) => {
    const validChannels = [
      // Service management
      'start-apache', 'stop-apache', 'restart-apache', 'get-apache-logs',
      'start-mariadb', 'stop-mariadb', 'restart-mariadb', 'get-mariadb-logs',
      'check-status', 'get-app-logs',

      // Installation
      'install-progress', 'install-error',

      // Configuration
      'get-config', 'update-config', 'reset-config',

      // Backups
      'list-backups', 'create-backup', 'restore-backup', 'delete-backup',
      'export-database',

      // UI
      'open-settings', 'open-external', 'get-paths'
    ];
    if (validChannels.includes(channel)) ipcRenderer.send(channel, ...args);
  },
  receive: (channel, func) => {
    const validChannels = [
      // Service events
      'service-status', 'service-logs', 'service-crash',

      // Installation events
      'install-progress', 'install-error',

      // Configuration events
      'config-data', 'config-updated', 'config-error',

      // Backup events
      'backups-list', 'backup-created', 'backup-restored', 'backup-deleted',
      'backup-error', 'backup-progress', 'database-exported',

      // App events
      'app-logs', 'paths'
    ];
    if (validChannels.includes(channel)) ipcRenderer.on(channel, (event, ...args) => func(...args));
  },
  removeListener: (channel, func) => {
    ipcRenderer.removeListener(channel, func);
  }
});