/* tslint:disable */
/* eslint-disable */

export function clear_audio(): void;

export function export_binary(script_source: string): Uint8Array;

export function get_audio_count(): number;

export function get_audio_data(index: number): Uint8Array;

export function get_audio_name(index: number): string;

export function get_scene_json(): string;

export function load_binary(data: Uint8Array): string;

export function push_audio(name: string, format: number, data: Uint8Array): void;

export function reset_state(): void;

export function set_audio_name(index: number, name: string): void;

export function set_bytecode(bytecode: Uint8Array, variable_count: number, behaviors_val: any): void;

export function set_scene(shapes_json: string, anims_json: string, objects_json: string): void;

export function set_selected_object(id: number): void;

export function start(): void;

export function start_with(canvas_id: string, bin_url: string): void;

export function start_with_async(canvas_id: string, bin_url: string): Promise<void>;

export function toggle_hud(): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly clear_audio: () => void;
    readonly export_binary: (a: number, b: number) => [number, number, number];
    readonly get_audio_count: () => number;
    readonly get_audio_data: (a: number) => any;
    readonly get_audio_name: (a: number) => [number, number];
    readonly get_scene_json: () => [number, number, number, number];
    readonly load_binary: (a: number, b: number) => [number, number, number, number];
    readonly push_audio: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly reset_state: () => [number, number];
    readonly set_audio_name: (a: number, b: number, c: number) => void;
    readonly set_bytecode: (a: number, b: number, c: number, d: any) => [number, number];
    readonly set_scene: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number];
    readonly set_selected_object: (a: number) => void;
    readonly start: () => void;
    readonly start_with: (a: number, b: number, c: number, d: number) => [number, number];
    readonly start_with_async: (a: number, b: number, c: number, d: number) => any;
    readonly toggle_hud: () => void;
    readonly wasm_bindgen__closure__destroy__hd0b4bd68f98897ae: (a: number, b: number) => void;
    readonly wasm_bindgen__closure__destroy__hc7ad0bdaca4bc092: (a: number, b: number) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h081d185e278400a8: (a: number, b: number, c: number) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h062a78fa18ff1620: (a: number, b: number, c: any, d: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h3fa52adf08d8bebc: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h1a6c5a2d29470352: (a: number, b: number, c: any) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
