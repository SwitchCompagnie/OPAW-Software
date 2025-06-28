const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  send: (channel, ...args) => {
    const validChannels = [
      'start-apache', 'stop-apache', 'restart-apache', 'get-apache-logs',
      'start-mariadb', 'stop-mariadb', 'restart-mariadb', 'get-mariadb-logs',
      'check-status', 'install-progress', 'install-error',
    ];
    if (validChannels.includes(channel)) ipcRenderer.send(channel, ...args);
  },
  receive: (channel, func) => {
    const validChannels = ['service-status', 'service-logs', 'install-progress', 'install-error'];
    if (validChannels.includes(channel)) ipcRenderer.on(channel, (event, ...args) => func(...args));
  },
});