/* Verify local vendor provenance without executing third-party code. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'engine-lab/engine-manifest.json'),'utf8'));
const hash=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
const file=name=>fs.readFileSync(path.join(root,'engine-lab/vendor',name));
const loader=file('yaneuraou.k-p.js');
if(hash(loader)!==manifest.localLoaderSha256)throw Error('Local loader hash mismatch');
const original=Buffer.from(loader.toString().replace('Jb:function(){for(var a=0;2>a;++a)C.Qa()}','Jb:function(){for(var a=0;32>a;++a)C.Qa()}'));
if(hash(original)!==manifest.assets['yaneuraou.k-p.js'].sha256)throw Error('Loader differs beyond documented pool change');
if(hash(file('yaneuraou.k-p.worker.js'))!==manifest.assets['yaneuraou.k-p.worker.js'].sha256)throw Error('Worker hash mismatch');
const wasmArg=process.argv[2];
if(wasmArg){const wasm=fs.readFileSync(wasmArg),asset=manifest.assets['yaneuraou.k-p.wasm'];if(wasm.length!==asset.bytes||hash(wasm)!==asset.sha256)throw Error('WASM hash mismatch');}
console.log('Engine asset provenance verified'+(wasmArg?' (including WASM)':''));
