// Loose declarations for the txiki.js web-platform globals the backend uses,
// so backend code doesn't depend on a DOM lib.
declare function fetch(
  input: string,
  init?: Record<string, unknown>
): Promise<Response>;

declare interface Response {
  ok: boolean;
  status: number;
  headers: { get(name: string): string | null };
  json(): Promise<any>;
  text(): Promise<string>;
}

declare const console: {
  log(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
};

declare class URLSearchParams {
  constructor(init?: Record<string, string>);
  set(key: string, value: string): void;
  toString(): string;
}
