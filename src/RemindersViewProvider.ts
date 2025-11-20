import * as vscode from "vscode";
import * as fs from "fs";
import { ReminderManager } from "./ReminderManager";
import { Reminder } from "./Reminder";

export class RemindersViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "remindersView";
  private _view?: vscode.WebviewView;
  private reminderManager: ReminderManager;
  private disposables: vscode.Disposable[] = [];

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context: vscode.ExtensionContext
  ) {
    // Initialize ReminderManager with trigger handler
    this.reminderManager = new ReminderManager(_context, (reminder) => {
      this.handleReminderTrigger(reminder);
    });

    // Listen for any changes to update UI
    this.disposables.push(
      this.reminderManager.onChange(() => {
        this.updateWebview();
      })
    );
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((data) => {
      this.handleWebviewMessage(data);
    });

    // Initial update
    setTimeout(() => {
      this.updateWebview();
    }, 100);
  }

  private handleWebviewMessage(data: any) {
    switch (data.type) {
      case "addReminder":
        this.handleAddReminder(data.text, data.intervalMinutes);
        break;
      case "toggleReminder":
        this.handleToggleReminder(data.id);
        break;
      case "deleteReminder":
        this.handleDeleteReminder(data.id);
        break;
      case "getReminders":
        this.updateWebview();
        break;
      default:
        console.warn(`Unknown message type: ${data.type}`);
    }
  }

  private handleAddReminder(text: string, intervalMinutes: number) {
    const result = this.reminderManager.add(text, intervalMinutes);

    if (!result.success) {
      vscode.window.showErrorMessage(`Failed to add reminder: ${result.error}`);
      return;
    }

    console.log(`Added reminder: "${text}" with interval ${intervalMinutes} minutes`);
  }

  private handleToggleReminder(id: string) {
    const success = this.reminderManager.toggle(id);
    if (!success) {
      vscode.window.showErrorMessage(`Failed to toggle reminder with id: ${id}`);
    }
  }

  private handleDeleteReminder(id: string) {
    const success = this.reminderManager.delete(id);
    if (!success) {
      vscode.window.showErrorMessage(`Failed to delete reminder with id: ${id}`);
    }
  }

  private async handleReminderTrigger(reminder: Reminder): Promise<void> {
    let action: string | undefined;

    try {
      // Race between user action and timeout (Vscode auto-dismisses after 10s)
      const timeoutPromise = new Promise<string | undefined>((resolve) => {
        setTimeout(() => resolve(undefined), 10000);
      });

      const actionPromise = vscode.window.showInformationMessage(
        `Reminder: ${reminder.text}`,
        "Snooze (5 min)",
        "Pause",
        "Dismiss"
      );

      action = await Promise.race([actionPromise, timeoutPromise]);
    } catch (error) {
      console.error("Error showing reminder notification:", error);
      action = undefined;
    }

    // Handle the action
    switch (action) {
      case "Snooze (5 min)":
        this.reminderManager.snooze(reminder.id, 5);
        break;
      case "Pause":
        this.reminderManager.pause(reminder.id);
        break;
      case "Dismiss":
        this.reminderManager.dismiss(reminder.id);
        break;
      default:
        // No action or timeout -- automatically reschedule
        this.reminderManager.dismiss(reminder.id);
        break;
    }
  }

  private updateWebview() {
    if (!this._view) {
      console.log("Webview not initialized yet.");
      return;
    }

    const reminders = this.reminderManager.getAll();
    const stats = this.reminderManager.getStats();

    console.log("Updating webview with reminders and stats.");

    this._view.webview.postMessage({
      type: "updateReminders",
      reminders: reminders,
      stats: stats,
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const htmlPath = vscode.Uri.joinPath(
      this._extensionUri,
      "media",
      "reminders.html"
    );
    const stylePath = vscode.Uri.joinPath(
      this._extensionUri,
      "media",
      "styles.css"
    );
    const scriptPath = vscode.Uri.joinPath(
      this._extensionUri,
      "media",
      "script.js"
    );

    // Get path to codicon font
    const codiconPath = vscode.Uri.joinPath(
      this._extensionUri,
      "node_modules",
      "@vscode/codicons",
      "dist",
      "codicon.css"
    );

    // Convert to webview URIs
    const styleUri = webview.asWebviewUri(stylePath);
    const scriptUri = webview.asWebviewUri(scriptPath);
    const codiconUri = webview.asWebviewUri(codiconPath);

    const htmlContent = fs.readFileSync(htmlPath.fsPath, "utf8");

    // Generate a nonce for security
    const nonce = this.getNonce();

    // Get the cspSource
    const cspSource = webview.cspSource;

    // Replace placeholders
    return htmlContent
      .replace(/{{nonce}}/g, nonce)
      .replace(/{{cspSource}}/g, cspSource)
      .replace(/{{codiconUri}}/g, codiconUri.toString())
      .replace(/{{styleUri}}/g, styleUri.toString())
      .replace(/{{scriptUri}}/g, scriptUri.toString());
  }

  private getNonce() {
    let text = "";
    const possible =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  dispose() {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.reminderManager.dispose();
  }
}
