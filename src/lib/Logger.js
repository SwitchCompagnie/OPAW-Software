const fs = require('fs').promises
const path = require('path')

class Logger {
  constructor(logDir) {
    this.logDir = logDir
    this.logFile = path.join(logDir, 'opaw.log')
    this.maxLogSize = 5 * 1024 * 1024 // 5MB
  }

  async init() {
    try {
      await fs.mkdir(this.logDir, { recursive: true })
    } catch (error) {
      console.error('Failed to create log directory:', error)
    }
  }

  async log(level, message, data = null) {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level,
      message,
      ...(data && { data })
    }

    const logLine = `${timestamp} [${level}] ${message}${data ? ' ' + JSON.stringify(data) : ''}\n`

    // Console output
    console.log(logLine.trim())

    // File output
    try {
      await this.rotateIfNeeded()
      await fs.appendFile(this.logFile, logLine, 'utf8')
    } catch (error) {
      console.error('Failed to write log:', error)
    }

    return logEntry
  }

  async rotateIfNeeded() {
    try {
      const stats = await fs.stat(this.logFile)
      if (stats.size > this.maxLogSize) {
        const backupFile = `${this.logFile}.${Date.now()}.old`
        await fs.rename(this.logFile, backupFile)

        // Keep only last 5 backup logs
        const files = await fs.readdir(this.logDir)
        const oldLogs = files
          .filter(f => f.startsWith('opaw.log.') && f.endsWith('.old'))
          .sort()
          .reverse()

        for (const file of oldLogs.slice(5)) {
          await fs.unlink(path.join(this.logDir, file))
        }
      }
    } catch (error) {
      // File doesn't exist yet, ignore
    }
  }

  info(message, data) {
    return this.log('INFO', message, data)
  }

  warn(message, data) {
    return this.log('WARN', message, data)
  }

  error(message, data) {
    return this.log('ERROR', message, data)
  }

  debug(message, data) {
    return this.log('DEBUG', message, data)
  }

  async getLogs(lines = 100) {
    try {
      const content = await fs.readFile(this.logFile, 'utf8')
      const logLines = content.split('\n').filter(line => line.trim())
      return logLines.slice(-lines).join('\n')
    } catch (error) {
      return 'No logs available'
    }
  }
}

module.exports = Logger
