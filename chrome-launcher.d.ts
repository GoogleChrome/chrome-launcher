/// <reference types="node" />
/// <reference types="rimraf" />
import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as rimraf from 'rimraf';
export interface Options {
    startingUrl?: string;
    chromeFlags?: Array<string>;
    port?: number;
    handleSIGINT?: boolean;
    chromePath?: string;
    userDataDir?: string | boolean;
    logLevel?: string;
    enableExtensions?: boolean;
    connectionPollInterval?: number;
    maxConnectionRetries?: number;
}
export interface LaunchedChrome {
    pid: number;
    port: number;
    kill: () => Promise<{}>;
}
export interface ModuleOverrides {
    fs?: typeof fs;
    rimraf?: typeof rimraf;
    spawn?: typeof childProcess.spawn;
}
export declare function launch(opts?: Options): Promise<LaunchedChrome>;
export declare class Launcher {
    private opts;
    private tmpDirandPidFileReady;
    private pidFile;
    private startingUrl;
    private outFile?;
    private errFile?;
    private chromePath?;
    private enableExtensions?;
    private chromeFlags;
    private requestedPort?;
    private connectionPollInterval;
    private maxConnectionRetries;
    private chrome?;
    private fs;
    private rimraf;
    private spawn;
    private useDefaultProfile;
    userDataDir?: string;
    port?: number;
    pid?: number;
    constructor(opts?: Options, moduleOverrides?: ModuleOverrides);
    private readonly flags;
    makeTmpDir(): string;
    prepare(): void;
    launch(): Promise<void | {}>;
    private spawnProcess(execPath);
    private cleanup(client?);
    private isDebuggerReady();
    private waitUntilReady();
    kill(): Promise<{}>;
    destroyTmp(): Promise<{}>;
}
