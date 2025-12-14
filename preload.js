const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // we’ll add methods later if needed
});
