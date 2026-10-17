/// <reference types="vite/client" />

declare module 'martinez-polygon-clipping' {
  export function union(a: unknown, b: unknown): unknown
  export function diff(a: unknown, b: unknown): unknown
  export function intersection(a: unknown, b: unknown): unknown
}
