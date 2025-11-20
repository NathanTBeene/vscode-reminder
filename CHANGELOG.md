# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.2] - 2025-11-20

### Added

- Added `vsce` to `devDependencies` to support packaging the extension

### Changed

- Updated `package.json` to include a `compile` step for the package command
- Updated `package-lock.json` and package metadata related to types
- Added build debug flags to help diagnose packaging/build issues

### Fixed

- Fixed VS Code types dependency resolution

## [0.1.1] - 2025-11-14

### Fixed

- Fixed reminders not loading properly when closing and relaunching VS Code
- Added missing break statements in message handling switch cases
- Improved reminder scheduling logic for missed triggers during extension reload

## [0.1.0] - 2025-11-14

### Added

- CSS breakpoints for responsive design at smaller sidebar sizes
- Example image to demonstrate the extension functionality
- Codicons support for better release packaging

### Changed

- Updated README.md with example image and improved documentation
- Updated installation instructions in README.md
- Modified package.json build scripts - replaced `vscode:prepublish` with direct compile script
- Updated package script to use `vsce package` command

### Fixed

- Improved .vscodeignore configuration for proper extension packaging
- Added exception for codicons to .vscodeignore to properly load icons

## [0.0.1] - 2025-11-14

### Added

- Initial release of VSCode Reminder extension
- Interval reminder functionality for VSCode
- Basic reminder interface and webview
- MIT License
- Initial project structure and configuration
