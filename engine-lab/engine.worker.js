/* GPL-3.0-only. Isolated adapter for the pinned YaneuraOu WASM proof of concept. */
let engine = null, loading = false;
const children = new Set();
const NativeWorker = self.Worker;
self.Worker = class extends NativeWorker {
  constructor(...args){super(...args);children.add(this);}
  terminate(){children.delete(this);super.terminate();}
};
const send = (type, data = {}) => self.postMessage({type,...data});
self.onmessage = async ({data}) => {
  try {
    if (data.type === 'init') {
      if (loading || engine) throw new Error('Already initialized');
      loading = true;
      const start = performance.now();
      if (!self.crossOriginIsolated || typeof SharedArrayBuffer !== 'function') throw new Error('Isolation is required');
      const manifestResponse = await fetch('./engine-manifest.json');
      if (!manifestResponse.ok) throw new Error('Engine manifest could not be loaded');
      const manifest = await manifestResponse.json();
      const fetchStart = performance.now();
      const response = await fetch(manifest.wasmUrl, {mode:'cors',credentials:'omit'});
      if (!response.ok) throw new Error(`WASM download failed: ${response.status}`);
      const binary = await response.arrayBuffer();
      const asset = manifest.assets['yaneuraou.k-p.wasm'];
      const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', binary)), x=>x.toString(16).padStart(2,'0')).join('');
      if (binary.byteLength !== asset.bytes || digest !== asset.sha256) throw new Error('WASM integrity check failed');
      const downloadMs = performance.now() - fetchStart;
      const base = new URL('./vendor/',self.location.href);
      importScripts(new URL('yaneuraou.k-p.js',base).href);
      engine = await YaneuraOu_K_P({wasmBinary:binary,
        wasmMemory:new WebAssembly.Memory({initial:1408,maximum:4096,shared:true}),
        mainScriptUrlOrBlob:new URL('yaneuraou.k-p.js',base).href,
        locateFile:path=>new URL(path,base).href,
        printErr:text=>send('log',{text:String(text).slice(0,1000)}),
        onAbort:reason=>send('error',{message:`Engine aborted: ${reason}`})});
      engine.addMessageListener(line=>send('line',{line:String(line)}));
      send('initialized',{metrics:{downloadMs,initMs:performance.now()-start,wasmBytes:binary.byteLength,
        wasmMemoryBytes:engine.HEAPU8.buffer.byteLength,initialWorkerPool:2,memoryLimitBytes:256*1024*1024,
        version:manifest.version,sha256:digest}});
    } else if (data.type === 'metrics') {
      if (!engine) throw new Error('Engine is not initialized');
      send('metrics',{wasmMemoryBytes:engine.HEAPU8.buffer.byteLength,workerCount:engine.PThread.I.length+engine.PThread.ia.length});
    } else if (data.type === 'command') {
      if (!engine) throw new Error('Engine is not initialized');
      if (typeof data.command !== 'string' || /[\r\n]/.test(data.command) || data.command.length > 5000) throw new Error('Invalid command');
      engine.postMessage(data.command);
    } else if (data.type === 'dispose') {
      if(engine) engine.terminate();
      for(const child of children)child.terminate();
      engine=null;send('disposed');self.close();
    }
  } catch(error) {send('error',{message:error.message||String(error)});}
};
