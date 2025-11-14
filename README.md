# VSCode Reminder Extension

A simple VS Code extension for creating repeating reminders that notify you at regular intervals.

## Features

- Create custom reminders with text and interval (in minutes)
- Start/pause reminders as needed
- Snooze reminders for 5 minutes when they trigger
- Visual countdown showing time until next reminder
- Persistent reminders that survive VS Code restarts

## Usage

1. Open the Reminders view in the sidebar
2. Enter reminder text and interval in minutes
3. Click "Add Reminder" to create it
4. Use the play/pause button to toggle reminders
5. When a reminder triggers, choose to dismiss, pause, or snooze

## Installation

1. Download the latest `.vsix` file from the [GitHub releases page](https://github.com/NathanTBeene/vscode-reminder/releases).
2. In VSCode, go to your `Extensions` tab.
3. In the top right corner, click the three dots.
4. Click `Install from VSIX`.
5. Enjoy.

### Manual Build

To build the extension yourself:

1. Clone the repository
2. Run `npm install` to install dependencies
3. Run `vsce package` to create a `.vsix` file
4. Install the generated `.vsix` file in VS Code

## Requirements

- VS Code 1.105.0 or higher
