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
    const argumentsRegex = /(^[^ ]+).*/; // Take everything up to the first space
    const chromeExecRegex = '^Exec=\/.*\/(google-chrome|chrome|chromium)-.*';
    let installations = [];
    if (canAccess(folder)) {
        // Output of the grep & print looks like:
        //    /opt/google/chrome/google-chrome --profile-directory
        //    /home/user/Downloads/chrome-linux/chrome-wrapper %U
        let execPaths = execSync(`grep -ER "${chromeExecRegex}" ${folder} | awk -F '=' '{print $2}'`)
            .toString()
            .split(newLineRegex)
            .map((execPath) => execPath.replace(argumentsRegex, '$1'));
        execPaths.forEach((execPath) => canAccess(execPath) && installations.push(execPath));
    }
    return installations;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hyb21lLWZpbmRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNocm9tZS1maW5kZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7R0FJRztBQUNILFlBQVksQ0FBQzs7QUFFYixNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDekIsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzdCLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQyxRQUFRLENBQUM7QUFDbkQsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDLFlBQVksQ0FBQztBQUMzRCxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsbUJBQW1CLENBQUMsQ0FBQztBQUV6QyxtQ0FBNEM7QUFFNUMsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDO0FBSTdCO0lBQ0UsTUFBTSxRQUFRLEdBQUcsQ0FBQyxzQ0FBc0MsRUFBRSwrQkFBK0IsQ0FBQyxDQUFDO0lBRTNGLE1BQU0sVUFBVSxHQUFHLG1EQUFtRDtRQUNsRSxpREFBaUQ7UUFDakQsZ0NBQWdDLENBQUM7SUFFckMsTUFBTSxhQUFhLEdBQWtCLEVBQUUsQ0FBQztJQUV4QyxNQUFNLGdCQUFnQixHQUFHLGlCQUFpQixFQUFFLENBQUM7SUFDN0MsRUFBRSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO1FBQ3JCLGFBQWEsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUN2QyxDQUFDO0lBRUQsUUFBUSxDQUNKLEdBQUcsVUFBVSxRQUFRO1FBQ3JCLG1EQUFtRDtRQUNuRCw4QkFBOEIsQ0FBQztTQUM5QixRQUFRLEVBQUU7U0FDVixLQUFLLENBQUMsWUFBWSxDQUFDO1NBQ25CLE9BQU8sQ0FBQyxDQUFDLElBQVk7UUFDcEIsUUFBUSxDQUFDLE9BQU8sQ0FBQyxNQUFNO1lBQ3JCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ2hELEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3hCLGFBQWEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDL0IsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7SUFFUCxnREFBZ0Q7SUFDaEQsbUJBQW1CO0lBQ25CLE1BQU0sVUFBVSxHQUFlO1FBQzdCLEVBQUMsS0FBSyxFQUFFLElBQUksTUFBTSxDQUFDLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLDRCQUE0QixDQUFDLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBQztRQUNqRixFQUFDLEtBQUssRUFBRSxJQUFJLE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxtQ0FBbUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUM7UUFDeEYsRUFBQyxLQUFLLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBQztRQUNyRCxFQUFDLEtBQUssRUFBRSxzQ0FBc0MsRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFDO1FBQzVELEVBQUMsS0FBSyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUMsRUFBQztRQUMvQyxFQUFDLEtBQUssRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLEVBQUM7S0FDdkQsQ0FBQztJQUVGLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBQyxLQUFLLEVBQUUsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUFDO0lBQzFGLENBQUM7SUFFRCxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7UUFDNUIsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFDLEtBQUssRUFBRSxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUFDO0lBQzdFLENBQUM7SUFFRCxrQkFBa0I7SUFDbEIsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsVUFBVSxDQUFDLENBQUM7QUFDekMsQ0FBQztBQWxERCx3QkFrREM7QUFFRDtJQUNFLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2QyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUM7SUFDakMsQ0FBQztJQUVELEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BELEdBQUcsQ0FBQyxJQUFJLENBQ0osZ0JBQWdCLEVBQ2hCLCtFQUErRSxDQUFDLENBQUM7UUFDckYsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUM7SUFDOUMsQ0FBQztJQUVELE1BQU0sQ0FBQyxTQUFTLENBQUM7QUFDbkIsQ0FBQztBQUVEOzs7OztHQUtHO0FBQ0g7SUFDRSxJQUFJLGFBQWEsR0FBYSxFQUFFLENBQUM7SUFFakMsd0NBQXdDO0lBQ3hDLE1BQU0sZ0JBQWdCLEdBQUcsaUJBQWlCLEVBQUUsQ0FBQztJQUM3QyxFQUFFLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7UUFDckIsYUFBYSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7SUFFRCxnRkFBZ0Y7SUFDaEYsTUFBTSwwQkFBMEIsR0FBRztRQUNqQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSw0QkFBNEIsQ0FBQztRQUNoRSwwQkFBMEI7S0FDM0IsQ0FBQztJQUNGLDBCQUEwQixDQUFDLE9BQU8sQ0FBQyxNQUFNO1FBQ3ZDLGFBQWEsR0FBRyxhQUFhLENBQUMsTUFBTSxDQUFDLHFCQUFxQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDdEUsQ0FBQyxDQUFDLENBQUM7SUFFSCw4RkFBOEY7SUFDOUYsTUFBTSxXQUFXLEdBQUc7UUFDbEIsc0JBQXNCO1FBQ3RCLGVBQWU7UUFDZixrQkFBa0I7UUFDbEIsVUFBVTtLQUNYLENBQUM7SUFDRixXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsVUFBa0I7UUFDckMsSUFBSSxDQUFDO1lBQ0gsTUFBTSxVQUFVLEdBQUcsWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRXpGLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzFCLGFBQWEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDakMsQ0FBQztRQUNILENBQUM7UUFBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ1gsaUJBQWlCO1FBQ25CLENBQUM7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDMUIsTUFBTSxJQUFJLEtBQUssQ0FDWCxzREFBc0Q7WUFDdEQsMERBQTBELENBQUMsQ0FBQztJQUNsRSxDQUFDO0lBRUQsTUFBTSxVQUFVLEdBQWU7UUFDN0IsRUFBQyxLQUFLLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBQztRQUN0QyxFQUFDLEtBQUssRUFBRSx1QkFBdUIsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFDO1FBQzVDLEVBQUMsS0FBSyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUM7UUFDckMsRUFBQyxLQUFLLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBQztRQUN4QyxFQUFDLEtBQUssRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBQztLQUNqQyxDQUFDO0lBRUYsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUM7UUFDekMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFDLEtBQUssRUFBRSxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixDQUFDLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBQyxDQUFDLENBQUM7SUFDMUYsQ0FBQztJQUVELEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztRQUM1QixVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUMsS0FBSyxFQUFFLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBQyxDQUFDLENBQUM7SUFDN0UsQ0FBQztJQUVELE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQztBQUMvRCxDQUFDO0FBNURELHNCQTREQztBQUVEO0lBQ0UsK0VBQStFO0lBQy9FLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxHQUFHLDJCQUFtQixFQUFFLENBQUM7SUFDakQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEdBQUcsc0JBQXNCLENBQUM7SUFDbEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLDRCQUE0QixDQUFDO0lBRWhFLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztBQUNqQixDQUFDO0FBUEQsa0JBT0M7QUFFRDtJQUNFLE1BQU0sYUFBYSxHQUFrQixFQUFFLENBQUM7SUFDeEMsTUFBTSxRQUFRLEdBQUc7UUFDZixHQUFHLElBQUksQ0FBQyxHQUFHLFNBQVMsSUFBSSxDQUFDLEdBQUcsYUFBYSxJQUFJLENBQUMsR0FBRyxjQUFjLElBQUksQ0FBQyxHQUFHLFlBQVk7UUFDbkYsR0FBRyxJQUFJLENBQUMsR0FBRyxTQUFTLElBQUksQ0FBQyxHQUFHLFNBQVMsSUFBSSxDQUFDLEdBQUcsY0FBYyxJQUFJLENBQUMsR0FBRyxZQUFZO0tBQ2hGLENBQUM7SUFDRixNQUFNLFFBQVEsR0FBRztRQUNmLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUM7S0FDckYsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7SUFFbEIsTUFBTSxnQkFBZ0IsR0FBRyxpQkFBaUIsRUFBRSxDQUFDO0lBQzdDLEVBQUUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQztRQUNyQixhQUFhLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDdkMsQ0FBQztJQUVELFFBQVEsQ0FBQyxPQUFPLENBQUMsTUFBTSxJQUFJLFFBQVEsQ0FBQyxPQUFPLENBQUMsTUFBTTtRQUNoRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUM3QyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzFCLGFBQWEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDakMsQ0FBQztJQUNILENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDSixNQUFNLENBQUMsYUFBYSxDQUFDO0FBQ3ZCLENBQUM7QUF0QkQsc0JBc0JDO0FBRUQsY0FBYyxhQUF1QixFQUFFLFVBQXNCO0lBQzNELE1BQU0sZUFBZSxHQUFHLEVBQUUsQ0FBQztJQUMzQixNQUFNLENBQUMsYUFBYTtTQUVmLEdBQUcsQ0FBQyxDQUFDLElBQVk7UUFDaEIsR0FBRyxDQUFDLENBQUMsTUFBTSxJQUFJLElBQUksVUFBVSxDQUFDLENBQUMsQ0FBQztZQUM5QixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzFCLE1BQU0sQ0FBQyxFQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUMsQ0FBQztZQUMzQyxDQUFDO1FBQ0gsQ0FBQztRQUNELE1BQU0sQ0FBQyxFQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBQyxDQUFDO0lBQy9DLENBQUMsQ0FBQztTQUVELElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUVyQyxHQUFHLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUM5QixDQUFDO0FBRUQsbUJBQW1CLElBQVk7SUFDN0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ1YsTUFBTSxDQUFDLEtBQUssQ0FBQztJQUNmLENBQUM7SUFFRCxJQUFJLENBQUM7UUFDSCxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3BCLE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNYLE1BQU0sQ0FBQyxLQUFLLENBQUM7SUFDZixDQUFDO0FBQ0gsQ0FBQztBQUVELGNBQWMsR0FBZTtJQUMzQixNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQ2xDLENBQUM7QUFFRCwrQkFBK0IsTUFBYztJQUMzQyxNQUFNLGNBQWMsR0FBRyxZQUFZLENBQUMsQ0FBQyx3Q0FBd0M7SUFDN0UsTUFBTSxlQUFlLEdBQUcsZ0RBQWdELENBQUM7SUFFekUsSUFBSSxhQUFhLEdBQWtCLEVBQUUsQ0FBQztJQUN0QyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RCLHlDQUF5QztRQUN6QywwREFBMEQ7UUFDMUQseURBQXlEO1FBQ3pELElBQUksU0FBUyxHQUFHLFFBQVEsQ0FBQyxhQUFhLGVBQWUsS0FBSyxNQUFNLDRCQUE0QixDQUFDO2FBQ3hFLFFBQVEsRUFBRTthQUNWLEtBQUssQ0FBQyxZQUFZLENBQUM7YUFDbkIsR0FBRyxDQUFDLENBQUMsUUFBZ0IsS0FBSyxRQUFRLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBRXZGLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxRQUFnQixLQUFLLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxhQUFhLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFDL0YsQ0FBQztJQUVELE1BQU0sQ0FBQyxhQUFhLENBQUM7QUFDdkIsQ0FBQyJ9