import path from 'node:path'
import { BrowserWindow, app, shell } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'

// process.js 必须位于非依赖项的顶部
import './helpers/process.js'
import appStore from './helpers/store.js'

import log from './helpers/log.js'
import './helpers/console.js'

import { icnsLogoPath, icoLogoPath, logoPath } from './configs/index.js'

import events from './events/index.js'

log.initialize({ preload: true })

const debug = !!appStore.get('common.debug')

log.info('Debug Status:', debug)

if (!debug) {
  log.warn(
    'Debug Tips:',
    '如果需要生成并查看运行日志请在偏好设置页面启动调试功能',
  )
}

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js
// │

process.env.DIST = path.join(__dirname, '../dist')

let mainWindow
// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

function createWindow() {
  let icon = logoPath

  if (process.platform === 'win32') {
    icon = icoLogoPath
  }
  else if (process.platform === 'darwin') {
    icon = icnsLogoPath
  }

  mainWindow = new BrowserWindow({
    // 这里设置的图标仅在开发模式生效，打包后将使用应用程序图标
    ...(!app.isPackaged
      ? {
          icon,
        }
      : {}),
    show: false,
    width: 1200,
    height: 800,
    minWidth: 1200,
    minHeight: 800,
    autoHideMenuBar: true,
    webPreferences: {
      // nodeIntegration: true,
      // contextIsolation: false,
      preload: path.join(__dirname, './preload.js'),
      sandbox: false,
      spellcheck: false,
    },
    backgroundColor: 'white',
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Test active push message to Renderer-process.
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.webContents.send(
      'main-process-message',
      new Date().toLocaleString(),
    )
  })

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
  }
  else {
    mainWindow.loadFile(path.join(process.env.DIST, 'index.html'))
  }

  events(mainWindow)
}

app.on('window-all-closed', () => {
  app.quit()
  mainWindow = null
})

// 仅 macOS 有这个事件
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }

  if (app.isHidden()) {
    app.show()
    app.focus()
  }

  if (!app.dock.isVisible()) {
    app.dock.show()
  }
})

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.viarotel.escrcpy')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()
})
