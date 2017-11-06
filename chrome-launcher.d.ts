/// <reference types="node" />
/// <reference types="rimraf" />
import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as rimraf from 'rimraf';
import { ChildProcess } from "child_process";
export interface Options {
    startingUrl?: string;
    chromeFlags?: Array<string>;
    port?: number;
    handleSIGINT?: boolean;
    chromePath?: string;
    userDataDir?: string;
    logLevel?: string;
    enableExtensions?: boolean;
    connectionPollInterval?: number;
    maxConnectionRetries?: number;
}
export interface LaunchedChrome {
    pid: number;
    port: number;
    kill: () => Promise<{}>;
    chromeProcess: ChildProcess | undefined;
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
    chrome?: childProcess.ChildProcess;
    private fs;
    private rimraf;
    private spawn;
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
