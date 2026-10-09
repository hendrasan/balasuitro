/// <reference types="svelte" />
/// <reference types="vite/client" />

declare module 'zzfx' {
  export function zzfx(...params: (number | undefined)[]): AudioBufferSourceNode;
  export const ZZFX: { volume: number; audioContext: AudioContext };
}
