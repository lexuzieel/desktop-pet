const { app, BrowserWindow, ipcMain, screen } = require('electron');
let win;
app.whenReady().then(() => {
  win = new BrowserWindow({
    width: 340, height: 480, transparent: true, frame: false,
    alwaysOnTop: true, resizable: false, hasShadow: false, skipTaskbar: false,
    webPreferences: { preload: __dirname + '/preload.js' }
  });
  win.loadFile('index.html');
});
ipcMain.on('move', (_, x, y) => win.setPosition(Math.round(x), Math.round(y)));
ipcMain.handle('pos', () => ({ cursor: screen.getCursorScreenPoint(), win: win.getPosition() }));
ipcMain.on('quit', () => app.quit());
app.on('window-all-closed', () => app.quit());
