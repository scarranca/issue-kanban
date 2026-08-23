// Minimal typings for the built-in SQLite module (txiki.js `tjs:sqlite`).
declare module 'tjs:sqlite' {
  export interface SqliteStatement {
    run(...params: unknown[]): void;
    all<T = Record<string, unknown>>(...params: unknown[]): T[];
    finalize(): void;
  }

  export class Database {
    constructor(path: string, opts?: { readonly?: boolean });
    exec(sql: string): void;
    prepare(sql: string): SqliteStatement;
    close(): void;
  }
}
