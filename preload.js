const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('pet', {
  move: (x, y) => ipcRenderer.send('move', x, y),
  pos: () => ipcRenderer.invoke('pos'),
  quit: () => ipcRenderer.send('quit')
});
