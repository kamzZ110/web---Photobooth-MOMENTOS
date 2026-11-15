declare const process: {
  env: Record<string, string | undefined>;
  on(event: string, listener: (...args: unknown[]) => void): void;
  exit(code?: number): never;
};

declare const console: {
  log(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
};

declare function setInterval(handler: () => void, timeout?: number): unknown;

declare class Buffer {
  static from(data: string, encoding?: string): Buffer;
  static from(data: number[]): Buffer;
  static concat(list: Buffer[]): Buffer;
  static alloc(size: number): Buffer;
  readonly length: number;
  [index: number]: number;
  subarray(start?: number, end?: number): Buffer;
  toString(encoding?: string): string;
  readUInt16BE(offset?: number): number;
  writeUInt16BE(value: number, offset?: number): number;
  writeUInt32BE(value: number, offset?: number): number;
}

declare module 'node:http' {
  export interface IncomingMessage {
    method?: string;
    url?: string;
    headers: Record<string, string | string[] | undefined>;
    socket: { remoteAddress?: string };
  }
  export interface ServerResponse {
    writeHead(statusCode: number, headers?: Record<string, string>): void;
    end(data?: string): void;
  }
  export interface DuplexSocket {
    write(data: string | Buffer): void;
    end(): void;
    destroy(): void;
    on(event: 'data', listener: (chunk: Buffer) => void): void;
    on(event: 'close' | 'error' | 'end', listener: () => void): void;
  }
  export interface Server {
    listen(port: number, host?: string, cb?: () => void): void;
    close(cb?: () => void): void;
    on(
      event: 'upgrade',
      listener: (req: IncomingMessage, socket: DuplexSocket, head: Buffer) => void
    ): void;
    on(event: string, listener: (...args: unknown[]) => void): void;
  }
  export function createServer(
    handler: (req: IncomingMessage, res: ServerResponse) => void
  ): Server;
}

declare module 'node:crypto' {
  export interface Hash {
    update(data: string): Hash;
    digest(encoding: 'base64' | 'hex'): string;
  }
  export function createHash(algorithm: string): Hash;
  export function randomUUID(): string;
  export function randomInt(min: number, max: number): number;
}
