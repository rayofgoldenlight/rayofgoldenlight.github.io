import { WASI, File, OpenFile, ConsoleStdout } from 'https://cdn.jsdelivr.net/npm/@bjorn3/browser_wasi_shim@0.2.19/dist/index.js';

let wasmExports = null;

// Initialize WASM in background
async function loadWasm() {
    const fds = [
        new OpenFile(new File([])), 
        ConsoleStdout.lineBuffered((msg) => console.log(`[WASM] ${msg}`)), 
        ConsoleStdout.lineBuffered((msg) => console.warn(`[WASM ERR] ${msg}`))
    ];
    const wasi = new WASI([], [], fds);
    const importObject = { "wasi_snapshot_preview1": wasi.wasiImport };
    
    try {
        const response = await fetch('analyzer.wasm');
        const wasm = await WebAssembly.instantiateStreaming(response, importObject);
        wasi.inst = wasm.instance;

        wasm.instance.exports._initialize();
        wasmExports = wasm.instance.exports;

        if (wasmExports.hs_init) {
            wasmExports.hs_init(0, 0); 
        }
        
        postMessage({ type: 'READY' });
    } catch (err) {
        console.error("Worker WASM load failed:", err);
        postMessage({ type: 'ERROR', message: 'Failed to load analyzer.wasm' });
    }
}

// Helper to read string from memory
function readCString(ptr, memory) {
    const bytes = new Uint8Array(memory.buffer);
    let end = ptr;
    while (bytes[end] !== 0) { end++; }
    return new TextDecoder('utf-8').decode(bytes.subarray(ptr, end));
}

async function computeSHA256(bytes) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Listen for files from the main UI
onmessage = async function(e) {
    if (e.data.type === 'ANALYZE') {
        if (!wasmExports) {
            postMessage({ type: 'ERROR', message: 'WASM not loaded yet.' });
            return;
        }

        const { byteData, fileName, enableDisassembly, instructionCount} = e.data;
        const len = byteData.length;

        try {
            // Calculate Hash
            const sha256 = await computeSHA256(byteData);

            const ptr = wasmExports.malloc(len);
            const memoryArray = new Uint8Array(wasmExports.memory.buffer);
            memoryArray.set(byteData, ptr);
            
            const doDisasmInt = enableDisassembly ? 1 : 0;
            const count = instructionCount || 5000;

            const resultPtr = wasmExports.analyze_pe_wasm(ptr, len, doDisasmInt, count);
            const jsonString = readCString(resultPtr, wasmExports.memory);
            
            wasmExports.free(ptr);
            wasmExports.free(resultPtr);
            
            const report = JSON.parse(jsonString);
            report.fileName = fileName;
            report.sha256 = sha256; // Attach hash to report
            postMessage({ type: 'REPORT', report });
        } catch (error) {
            postMessage({ type: 'ERROR', message: error.toString() });
        }
    }
};

loadWasm();