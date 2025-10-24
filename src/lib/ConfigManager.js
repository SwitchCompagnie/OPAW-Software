const fs = require('fs').promises
const path = require('path')
const crypto = require('crypto')

class ConfigManager {
  constructor(configPath, logger) {
    this.configPath = configPath
    this.logger = logger
    this.config = null
    this.defaults = {
      version: '1.1.0',
      mariadb: {
        port: 3306,
        password: this.generatePassword(),
        autoStart: true,
        autoRestart: true
      },
      apache: {
        port: 80,
        autoStart: true,
        autoRestart: true
      },
      php: {
        version: '8.4.12',
        maxUploadSize: '128M',
        maxPostSize: '128M',
        memoryLimit: '256M'
      },
      phpmyadmin: {
        enabled: true
      },
      logs: {
        maxLines: 100,
        autoRefresh: true,
        refreshInterval: 5000
      },
      backup: {
        autoBackup: false,
        backupInterval: 86400000, // 24 hours
        maxBackups: 10,
        backupPath: 'backups'
      },
      ui: {
        minimizeToTray: true,
        startMinimized: false,
        language: 'fr'
      }
    }
  }

  generatePassword(length = 24) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
    let password = ''
    const randomBytes = crypto.randomBytes(length)

    for (let i = 0; i < length; i++) {
      password += charset[randomBytes[i] % charset.length]
    }

    return password
  }

  async load() {
    try {
      const data = await fs.readFile(this.configPath, 'utf8')
      this.config = JSON.parse(data)

      // Merge with defaults for any missing keys
      this.config = this.mergeDefaults(this.config, this.defaults)

      await this.logger.info('Configuration loaded successfully')
      return this.config
    } catch (error) {
      if (error.code === 'ENOENT') {
        await this.logger.info('No config file found, creating default configuration')
        this.config = { ...this.defaults }
        await this.save()
        return this.config
      }
      await this.logger.error('Failed to load config', { error: error.message })
      throw error
    }
  }

  mergeDefaults(config, defaults) {
    const merged = { ...defaults }

    for (const key in config) {
      if (typeof config[key] === 'object' && !Array.isArray(config[key]) && config[key] !== null) {
        merged[key] = this.mergeDefaults(config[key], defaults[key] || {})
      } else {
        merged[key] = config[key]
      }
    }

    return merged
  }

  async save() {
    try {
      const configDir = path.dirname(this.configPath)
      await fs.mkdir(configDir, { recursive: true })
      await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2), 'utf8')
      await this.logger.info('Configuration saved successfully')
    } catch (error) {
      await this.logger.error('Failed to save config', { error: error.message })
      throw error
    }
  }

  get(key) {
    const keys = key.split('.')
    let value = this.config

    for (const k of keys) {
      value = value?.[k]
    }

    return value
  }

  async set(key, value) {
    const keys = key.split('.')
    let obj = this.config

    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) obj[keys[i]] = {}
      obj = obj[keys[i]]
    }

    obj[keys[keys.length - 1]] = value
    await this.save()
    await this.logger.info(`Config updated: ${key}`, { value })
  }

  getAll() {
    return { ...this.config }
  }

  async reset() {
    this.config = { ...this.defaults }
    await this.save()
    await this.logger.info('Configuration reset to defaults')
  }
}

module.exports = ConfigManager
