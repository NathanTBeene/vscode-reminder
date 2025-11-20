# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1] - 2025-11-20

### Changed
- `load()` function within `ReminderManager.ts` will now migrate previous `ReminderData` format to current.

### Added
- Event listener in `script.js` for pressing `ENTER` to submit reminder.

### Fixed
- Reminders now trigger properly after being added for the first time.

## [0.2.0] - 2025-11-20

### Changed
- **Major refactoring**: Complete architectural overhaul with better separation of concerns
- Introduced state machine for reminder lifecycle (`ACTIVE`, `PAUSED`, `SNOOZED`) replacing the boolean flags
- Split singular `RemindersViewProvider` into more focused modules:
  - `Reminder.ts` - Reminder model with state machine and validation
  - `ReminderScheduler.ts` - Dedicated timer management
  - `ReminderManager.ts` - Business logic and persistance
  - `RemindersViewProvider.ts` - UI Layer
- Updated webview to use state-based format as well
- Better observer pattern for UI updates in `script.js`
- Improved resource cleanup with a proper `dispose()` call.

### Added
- Better error handling and validation for timers
- Scheduling states for easier mantaining of notifications.
- Stat tracking via `ReminderManager.getStats()`

### Fixed
- Improved lifecycle management that prevents invalid state combinations
- Better timer cleanup and rsolution to prevent memory leaks.
- More reliable scheduling for missed reminders after an extension reload.

### Developer Notes
- Extension is much more maintainable with better layers.
- Each component is now able to be tested independently.
- Easier to extend with new features.
- No user-facing changes. The UI and behavior remain the same.

## [0.1.2] - 2025-08-20

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
