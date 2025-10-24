const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron')
const path = require('path')
const fs = require('fs').promises

// Import our new modules
const Logger = require('./lib/Logger')
const ConfigManager = require('./lib/ConfigManager')
const ServiceManager = require('./lib/ServiceManager')
const InstallManager = require('./lib/InstallManager')
const BackupManager = require('./lib/BackupManager')

// Global variables
let mainWindow
let installWindow
let settingsWindow
let tray
let logger
let config
let serviceManager
let installManager
let backupManager

// Paths
const baseDir = path.join(app.getPath('userData'), 'services')
const configPath = path.join(app.getPath('userData'), 'config.json')
const logDir = path.join(app.getPath('userData'), 'logs')

// Initialize managers
async function initializeManagers() {
  logger = new Logger(logDir)
  await logger.init()
  await logger.info('Application starting...')

  config = new ConfigManager(configPath, logger)
  await config.load()

  serviceManager = new ServiceManager(baseDir, config, logger)
  installManager = new InstallManager(baseDir, config, logger)
  backupManager = new BackupManager(baseDir, config, logger)
  await backupManager.init()

  // Setup service event handlers
  serviceManager.onStatusChange((service, status, message) => {
    if (mainWindow) {
      mainWindow.webContents.send('service-status', service, status, message)
    }
  })

  serviceManager.onCrash((service) => {
    if (mainWindow) {
      mainWindow.webContents.send('service-crash', service)
    }
  })

  // Setup install event handlers
  installManager.onProgress((percentage, message) => {
    if (installWindow) {
      installWindow.webContents.send('install-progress', percentage, message)
    }
  })

  installManager.onError((error) => {
    if (installWindow) {
      installWindow.webContents.send('install-error', error.message)
    }
  })

  // Setup backup event handlers
  backupManager.onProgress((message, data) => {
    if (mainWindow) {
      mainWindow.webContents.send('backup-progress', message, data)
    }
  })
}

// Create window helper
function createWindow(file, options = {}) {
  const win = new BrowserWindow({
    width: options.width || 1000,
    height: options.height || 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
    },
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'images', 'favicon.ico'),
    ...options,
  })

  win.loadFile(path.join(__dirname, file))
  return win
}

// System tray
function createTray() {
  const iconPath = path.join(__dirname, 'images', 'favicon.ico')
  const icon = nativeImage.createFromPath(iconPath)

  tray = new Tray(icon.resize({ width: 16, height: 16 }))

  const updateTrayMenu = async () => {
    const status = await serviceManager.checkStatus()

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'OPAW Server',
        enabled: false
      },
      { type: 'separator' },
      {
        label: `Apache: ${status.apache}`,
        icon: status.apache === 'running' ? null : null,
        submenu: [
          {
            label: 'Démarrer',
            click: () => serviceManager.startApache(),
            enabled: status.apache !== 'running'
          },
          {
            label: 'Arrêter',
            click: () => serviceManager.stopApache(),
            enabled: status.apache === 'running'
          },
          {
            label: 'Redémarrer',
            click: () => serviceManager.restartApache()
          }
        ]
      },
      {
        label: `MariaDB: ${status.mariadb}`,
        submenu: [
          {
            label: 'Démarrer',
            click: () => serviceManager.startMariaDB(),
            enabled: status.mariadb !== 'running'
          },
          {
            label: 'Arrêter',
            click: () => serviceManager.stopMariaDB(),
            enabled: status.mariadb === 'running'
          },
          {
            label: 'Redémarrer',
            click: () => serviceManager.restartMariaDB()
          }
        ]
      },
      { type: 'separator' },
      {
        label: 'Ouvrir localhost',
        click: () => require('electron').shell.openExternal('http://localhost')
      },
      {
        label: 'Ouvrir phpMyAdmin',
        click: () => require('electron').shell.openExternal('http://localhost/phpmyadmin')
      },
      { type: 'separator' },
      {
        label: 'Afficher',
        click: () => {
          if (mainWindow) {
            mainWindow.show()
            mainWindow.focus()
          }
        }
      },
      {
        label: 'Paramètres',
        click: () => openSettings()
      },
      { type: 'separator' },
      {
        label: 'Quitter',
        click: () => app.quit()
      }
    ])

    tray.setContextMenu(contextMenu)
    tray.setToolTip('OPAW Server')
  }

  updateTrayMenu()

  // Update tray menu every 5 seconds
  setInterval(updateTrayMenu, 5000)

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    }
  })
}

// Check and download services
async function checkAndDownloadServices() {
  try {
    await initializeManagers()

    if (!(await installManager.areServicesInstalled())) {
      installWindow = createWindow('install.html')

      try {
        await installManager.install()
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (error) {
        await logger.error('Installation failed', { error: error.message })
        return
      }

      if (installWindow) {
        installWindow.close()
        installWindow = null
      }
    }

    // Create main window
    mainWindow = createWindow('index.html')

    // Create system tray
    if (config.get('ui.minimizeToTray')) {
      createTray()
    }

    // Handle minimize to tray
    mainWindow.on('minimize', (event) => {
      if (config.get('ui.minimizeToTray') && tray) {
        event.preventDefault()
        mainWindow.hide()
      }
    })

    mainWindow.on('close', (event) => {
      if (config.get('ui.minimizeToTray') && tray && !app.isQuitting) {
        event.preventDefault()
        mainWindow.hide()
      }
    })

    // Auto-start services if configured
    await serviceManager.startAll()
  } catch (error) {
    console.error('Fatal error:', error)
    app.quit()
  }
}

// Settings window
function openSettings() {
  if (settingsWindow) {
    settingsWindow.focus()
    return
  }

  settingsWindow = createWindow('settings.html', {
    width: 800,
    height: 600,
    parent: mainWindow,
    modal: false
  })

  settingsWindow.on('closed', () => {
    settingsWindow = null
  })
}

// App lifecycle
app.on('ready', checkAndDownloadServices)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (!mainWindow) {
    mainWindow = createWindow('index.html')
  }
})

app.on('before-quit', async (event) => {
  app.isQuitting = true

  if (serviceManager) {
    event.preventDefault()
    await logger.info('Stopping all services before quit...')
    await serviceManager.stopAll()
    await logger.info('Application shutting down')
    app.exit(0)
  }
})

// IPC Handlers

// Service management
ipcMain.on('check-status', async (event) => {
  const status = await serviceManager.checkStatus()
  event.reply('service-status', 'apache', status.apache)
  event.reply('service-status', 'mariadb', status.mariadb)
})

ipcMain.on('start-apache', () => serviceManager.startApache())
ipcMain.on('stop-apache', () => serviceManager.stopApache())
ipcMain.on('restart-apache', () => serviceManager.restartApache())

ipcMain.on('start-mariadb', () => serviceManager.startMariaDB())
ipcMain.on('stop-mariadb', () => serviceManager.stopMariaDB())
ipcMain.on('restart-mariadb', () => serviceManager.restartMariaDB())

// Logs
ipcMain.on('get-apache-logs', async (event) => {
  const logsPath = path.join(baseDir, 'apache', 'logs', 'error.log')
  try {
    const content = await fs.readFile(logsPath, 'utf8')
    const lines = content.split('\n').slice(-100).join('\n')
    event.reply('service-logs', 'Apache', lines)
  } catch (error) {
    event.reply('service-logs', 'Apache', 'No logs available')
  }
})

ipcMain.on('get-mariadb-logs', async (event) => {
  const logsPath = path.join(baseDir, 'mariadb', 'data', 'mariadb.err')
  try {
    const content = await fs.readFile(logsPath, 'utf8')
    const lines = content.split('\n').slice(-100).join('\n')
    event.reply('service-logs', 'MariaDB', lines)
  } catch (error) {
    event.reply('service-logs', 'MariaDB', 'No logs available')
  }
})

ipcMain.on('get-app-logs', async (event) => {
  const logs = await logger.getLogs(100)
  event.reply('app-logs', logs)
})

// Configuration
ipcMain.on('get-config', (event) => {
  event.reply('config-data', config.getAll())
})

ipcMain.on('update-config', async (event, key, value) => {
  try {
    await config.set(key, value)
    event.reply('config-updated', key, value)
  } catch (error) {
    event.reply('config-error', error.message)
  }
})

ipcMain.on('reset-config', async (event) => {
  try {
    await config.reset()
    event.reply('config-data', config.getAll())
  } catch (error) {
    event.reply('config-error', error.message)
  }
})

// Backups
ipcMain.on('list-backups', async (event) => {
  try {
    const backups = await backupManager.listBackups()
    event.reply('backups-list', backups)
  } catch (error) {
    event.reply('backup-error', error.message)
  }
})

ipcMain.on('create-backup', async (event, name, includeAll) => {
  try {
    const backup = await backupManager.createBackup(name, includeAll)
    event.reply('backup-created', backup)
  } catch (error) {
    event.reply('backup-error', error.message)
  }
})

ipcMain.on('restore-backup', async (event, backupPath) => {
  try {
    await backupManager.restoreBackup(backupPath)
    event.reply('backup-restored')
  } catch (error) {
    event.reply('backup-error', error.message)
  }
})

ipcMain.on('delete-backup', async (event, backupPath) => {
  try {
    await backupManager.deleteBackup(backupPath)
    event.reply('backup-deleted', backupPath)
  } catch (error) {
    event.reply('backup-error', error.message)
  }
})

ipcMain.on('export-database', async (event, dbName) => {
  try {
    const file = await backupManager.exportDatabase(dbName)
    event.reply('database-exported', file)
  } catch (error) {
    event.reply('backup-error', error.message)
  }
})

// Settings window
ipcMain.on('open-settings', () => {
  openSettings()
})

// External links
ipcMain.on('open-external', (event, url) => {
  require('electron').shell.openExternal(url)
})

// Get paths
ipcMain.on('get-paths', (event) => {
  event.reply('paths', {
    base: baseDir,
    config: configPath,
    logs: logDir,
    htdocs: path.join(baseDir, '..', 'htdocs'),
    backups: path.join(baseDir, '..', 'backups')
  })
})
