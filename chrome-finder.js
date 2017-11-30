/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;
const execFileSync = require('child_process').execFileSync;
const log = require('lighthouse-logger');
const utils_1 = require("./utils");
const newLineRegex = /\r?\n/;
function darwin() {
    const suffixes = ['/Contents/MacOS/Google Chrome Canary', '/Contents/MacOS/Google Chrome'];
    const LSREGISTER = '/System/Library/Frameworks/CoreServices.framework' +
        '/Versions/A/Frameworks/LaunchServices.framework' +
        '/Versions/A/Support/lsregister';
    const installations = [];
    const customChromePath = resolveChromePath();
    if (customChromePath) {
        installations.push(customChromePath);
    }
    execSync(`${LSREGISTER} -dump` +
        ' | grep -i \'google chrome\\( canary\\)\\?.app$\'' +
        ' | awk \'{$1=""; print $0}\'')
        .toString()
        .split(newLineRegex)
        .forEach((inst) => {
        suffixes.forEach(suffix => {
            const execPath = path.join(inst.trim(), suffix);
            if (canAccess(execPath)) {
                installations.push(execPath);
            }
        });
    });
    // Retains one per line to maintain readability.
    // clang-format off
    const priorities = [
        { regex: new RegExp(`^${process.env.HOME}/Applications/.*Chrome.app`), weight: 50 },
        { regex: new RegExp(`^${process.env.HOME}/Applications/.*Chrome Canary.app`), weight: 51 },
        { regex: /^\/Applications\/.*Chrome.app/, weight: 100 },
        { regex: /^\/Applications\/.*Chrome Canary.app/, weight: 101 },
        { regex: /^\/Volumes\/.*Chrome.app/, weight: -2 },
        { regex: /^\/Volumes\/.*Chrome Canary.app/, weight: -1 },
    ];
    if (process.env.LIGHTHOUSE_CHROMIUM_PATH) {
        priorities.push({ regex: new RegExp(process.env.LIGHTHOUSE_CHROMIUM_PATH), weight: 150 });
    }
    if (process.env.CHROME_PATH) {
        priorities.push({ regex: new RegExp(process.env.CHROME_PATH), weight: 151 });
    }
    // clang-format on
    return sort(installations, priorities);
}
exports.darwin = darwin;
function resolveChromePath() {
    if (canAccess(process.env.CHROME_PATH)) {
        return process.env.CHROME_PATH;
    }
    if (canAccess(process.env.LIGHTHOUSE_CHROMIUM_PATH)) {
        log.warn('ChromeLauncher', 'LIGHTHOUSE_CHROMIUM_PATH is deprecated, use CHROME_PATH env variable instead.');
        return process.env.LIGHTHOUSE_CHROMIUM_PATH;
    }
    return undefined;
}
/**
 * Look for linux executables in 3 ways
 * 1. Look into CHROME_PATH env variable
 * 2. Look into the directories where .desktop are saved on gnome based distro's
 * 3. Look for google-chrome-stable & google-chrome executables by using the which command
 */
function linux() {
    const debugRoutine = true;
    let installations = [];
    // 1. Look into CHROME_PATH env variable
    const customChromePath = resolveChromePath();
    if (customChromePath) {
        installations.push(customChromePath);
    }
    // 2. Look into the directories where .desktop are saved on gnome based distro's
    const desktopInstallationFolders = [
        path.join(require('os').homedir(), '.local/share/applications/'),
        '/usr/share/applications/',
    ];
    desktopInstallationFolders.forEach(folder => {
        installations = installations.concat(findChromeExecutables(folder));
    });
    // Look for google-chrome(-stable) & chromium(-browser) executables by using the which command
    const executables = [
        'google-chrome-stable',
        'google-chrome',
        'chromium-browser',
        'chromium',
    ];
    executables.forEach((executable) => {
        try {
            const chromePath = execFileSync('which', [executable]).toString().split(newLineRegex)[0];
            if (canAccess(chromePath)) {
                installations.push(chromePath);
            }
        }
        catch (e) {
            // Not installed.
        }
    });

    if (debugRoutine) {
        console.log(`*****************************************`);
        console.log(`- installations: '${installations.join()}'`);
        console.log(`*****************************************`);        
    }

    if (!installations.length) {
        throw new Error('The environment variable CHROME_PATH must be set to ' +
            'executable of a build of Chromium version 54.0 or later.');
    }
    const priorities = [
        { regex: /chrome-wrapper$/, weight: 51 },
        { regex: /google-chrome-stable$/, weight: 50 },
        { regex: /google-chrome$/, weight: 49 },
        { regex: /chromium-browser$/, weight: 48 },
        { regex: /chromium$/, weight: 47 },
    ];
    if (process.env.LIGHTHOUSE_CHROMIUM_PATH) {
        priorities.push({ regex: new RegExp(process.env.LIGHTHOUSE_CHROMIUM_PATH), weight: 100 });
    }
    if (process.env.CHROME_PATH) {
        priorities.push({ regex: new RegExp(process.env.CHROME_PATH), weight: 101 });
    }
    return sort(uniq(installations.filter(Boolean)), priorities);
}
exports.linux = linux;
function wsl() {
    // Manually populate the environment variables assuming it's the default config
    process.env.LOCALAPPDATA = utils_1.getLocalAppDataPath();
    process.env.PROGRAMFILES = '/mnt/c/Program Files';
    process.env['PROGRAMFILES(X86)'] = '/mnt/c/Program Files (x86)';
    return win32();
}
exports.wsl = wsl;
function win32() {
    const installations = [];
    const suffixes = [
        `${path.sep}Google${path.sep}Chrome SxS${path.sep}Application${path.sep}chrome.exe`,
        `${path.sep}Google${path.sep}Chrome${path.sep}Application${path.sep}chrome.exe`
    ];
    const prefixes = [
        process.env.LOCALAPPDATA, process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)']
    ].filter(Boolean);
    const customChromePath = resolveChromePath();
    if (customChromePath) {
        installations.push(customChromePath);
    }
    prefixes.forEach(prefix => suffixes.forEach(suffix => {
        const chromePath = path.join(prefix, suffix);
        if (canAccess(chromePath)) {
            installations.push(chromePath);
        }
    }));
    return installations;
}
exports.win32 = win32;
function sort(installations, priorities) {
    const defaultPriority = 10;
    return installations
        .map((inst) => {
        for (const pair of priorities) {
            if (pair.regex.test(inst)) {
                return { path: inst, weight: pair.weight };
            }
        }
        return { path: inst, weight: defaultPriority };
    })
        .sort((a, b) => (b.weight - a.weight))
        .map(pair => pair.path);
}
function canAccess(file) {
    if (!file) {
        return false;
    }
    try {
        fs.accessSync(file);
        return true;
    }
    catch (e) {
        return false;
    }
}
function uniq(arr) {
    return Array.from(new Set(arr));
}
function findChromeExecutables(folder) {
    const debugRoutine = true;
    const argumentsRegex = /(^[^ ]+).*/; // Take everything up to the first space
    const chromeExecRegex = '^Exec=\/.*\/(google-chrome|chrome|chromium)-.*';

    // The supported options are determined by the Linux distribution
    // Use a very simple test to check which is supported
    let grepOptions = '-ER';
    try {
        // This should match a line in the /etc/hosts file
        const testResult = execSync('grep -ER "^127\.0" /etc').toString();
        if (testResult.indexOf('unrecognized option: R') > -1) grepOptions = '-Er';
    } catch (testError) {
        // There was some sort of error
        if (testError.message.indexOf('Command failed: grep -ER') > -1) {
            grepOptions = '-Er'
        } else {
            console.log(`There was an error testing the grep options... err.name: '${testError.name}', err.message: '${testError.message}'`);
        }
    }

    let statement = `grep ${grepOptions} "${chromeExecRegex}" ${folder} | awk -F '=' '{print $2}'`;
    if (debugRoutine) {
        console.log(`################### DEBUGGING ########################`);
        console.log(` * using '${statement}'`);        
    }

    let installations = [];
    if (canAccess(folder)) {
        // Output of the grep & print looks like:
        //    /opt/google/chrome/google-chrome --profile-directory
        //    /home/user/Downloads/chrome-linux/chrome-wrapper %U 
        let execPaths;
        
        execPaths = execSync(statement)
            .toString()
            .split(newLineRegex)
            .map((execPath) => execPath.replace(argumentsRegex, '$1'));
        

        execPaths.forEach((execPath) => canAccess(execPath) && installations.push(execPath));
    }

    if (debugRoutine) {
        console.log(`- installations: '${installations.join()}'`);
        console.log(`################### END DEBUGGING ########################`);
    }

    return installations;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hyb21lLWZpbmRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNocm9tZS1maW5kZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7R0FJRztBQUNILFlBQVksQ0FBQzs7QUFFYixNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDekIsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzdCLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQyxRQUFRLENBQUM7QUFDbkQsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDLFlBQVksQ0FBQztBQUMzRCxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsbUJBQW1CLENBQUMsQ0FBQztBQUV6QyxtQ0FBNEM7QUFFNUMsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDO0FBSTdCO0lBQ0UsTUFBTSxRQUFRLEdBQUcsQ0FBQyxzQ0FBc0MsRUFBRSwrQkFBK0IsQ0FBQyxDQUFDO0lBRTNGLE1BQU0sVUFBVSxHQUFHLG1EQUFtRDtRQUNsRSxpREFBaUQ7UUFDakQsZ0NBQWdDLENBQUM7SUFFckMsTUFBTSxhQUFhLEdBQWtCLEVBQUUsQ0FBQztJQUV4QyxNQUFNLGdCQUFnQixHQUFHLGlCQUFpQixFQUFFLENBQUM7SUFDN0MsRUFBRSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO1FBQ3JCLGFBQWEsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUN2QyxDQUFDO0lBRUQsUUFBUSxDQUNKLEdBQUcsVUFBVSxRQUFRO1FBQ3JCLG1EQUFtRDtRQUNuRCw4QkFBOEIsQ0FBQztTQUM5QixRQUFRLEVBQUU7U0FDVixLQUFLLENBQUMsWUFBWSxDQUFDO1NBQ25CLE9BQU8sQ0FBQyxDQUFDLElBQVksRUFBRSxFQUFFO1FBQ3hCLFFBQVEsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7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