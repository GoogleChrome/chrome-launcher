## 0.8.0 (Wed, 20 Sept 2017)
* `256399c` Add support for Windows Subsystem for Linux / BashOnWindows (#27)

## 0.7.0 (Thu, 14 Sept 2017)
* Project moved to its own repo: https://github.com/GoogleChrome/chrome-launcher
* `8d0766eb` Retry connection for longer (#21)
* `52cb50af` only include PROGRAMFILES(X86) if present (#20)
* `530822b9` log pid to kill (#22)
* `1d617ab3` add support for `connectionPollInterval ` and `maxConnectionRetries` (#19)
* `7474971f` Fix errors inside spawnPromise being ignored (https://github.com/GoogleChrome/lighthouse/pull/2939)

## 0.6.0 (Thu, 17 Aug 2017)
* `43baee69` mute any audio (#3028)
* `ae6e9551` Better SIGINT handling (#2959)
* `3ab3a117` docs: add changelog to launcher (#2987)

## 0.5.0 (Mon, 14 Aug 2017)
* `494f9911` clarify priority of chromePath options
* `1c11021a` add support for finding Chromium on Linux (#2950)
* `391e2043` Publish type definitions instead of source TypeScript files (#2898)
* `de408ad3` readme: update example using deprecated `LIGHTHOUSE_CHROMIUM_PATH` (#2929)
* `8bc6d18e` add license file to launcher package. (#2849)

## 0.4.0 (Tue, 1 Aug 2017)
* `37fd38ce` pass --enable-extensions on from manual-chrome-launcher (#2735)
* `c942d17e` support enabling extension loading (#2650)

## 0.3.2 (Wed, 19 Jul 2017)
* `112c2c7f` Fix chrome finder on linux/osx when process.env isn't populated (#2687)
* `5728695f` Added CHROME_PATH to readme (#2694)
* `fedc76a3` test: fix clang-format error (#2691)
* `a6bbcaba` nuke 'as string'
* `41df647f` cli: remove --select-chrome,--skip-autolaunch. Support CHROME_PATH env  (#2659)
* `8c9724e2` fix launcher w/ arbitrary flags (#2670)
* `9c0c0788` Expose LHR to modules consuming cli/run.ts (#2654)
* `6df6b0e2` support custom port via chrome-debug binary (#2644)
* `3f143b19` log the specific chrome spawn command.

## 0.3.1 (Wed, 5 Jul 2017)
* `ef081063` upgrade rimraf to latest (#2641)

## 0.3.0 (Fri, 30 Jun 2017)
* `edbb40d9` fix(driver): move performance observer registration to setupDriver (#2611)
