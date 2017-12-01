export declare function defaults<T>(val: T | undefined, def: T): T;
export declare function delay(time: number): Promise<{}>;
export declare function getPlatform(): "wsl" | "aix" | "android" | "darwin" | "freebsd" | "linux" | "openbsd" | "sunos" | "win32";
export declare function makeTmpDir(): string;
export declare function toWinDirFormat(dir?: string): string;
export declare function getLocalAppDataPath(): string;
