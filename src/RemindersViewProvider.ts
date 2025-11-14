import * as vscode from "vscode";
import * as fs from "fs";

interface Reminder {
  id: string;
  text: string;
  intervalMinutes: number;
  isActive: boolean;
  isSnoozed: boolean;
  nextTriggerTime: number | null;
}

export class RemindersViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "remindersView";
  private _view?: vscode.WebviewView;
  private reminders: Reminder[] = [];
  private timers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context: vscode.ExtensionContext
  ) {}

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
      switch (data.type) {
        case "addReminder":
          this.addReminder(data.text, data.intervalMinutes);
        case "toggleReminder":
          this.toggleReminder(data.id);
          break;
        case "deleteReminder":
          this.deleteReminder(data.id);
          break;
        case "getReminders":
          this.updateWebview();
          break;
      }
    });

    this.updateWebview();
  }

  private addReminder(text: string, minutes: number) {
    const reminder: Reminder = {
      id: Date.now().toString(),
      text: text,
      intervalMinutes: minutes,
      isActive: true,
      isSnoozed: false,
      nextTriggerTime: Date.now() + minutes * 60000,
    };

    if (reminder.intervalMinutes <= 0) {
      vscode.window.showErrorMessage(
        "Interval must be greater than 0 minutes."
      );
      return;
    }

    this.reminders.push(reminder);
    this.scheduleReminder(reminder);
    this.saveReminders();
    this.updateWebview();
  }

  private toggleReminder(id: string) {
    const reminder = this.reminders.find((r) => r.id === id);
    if (!reminder) {
      return;
    }

    reminder.isActive = !reminder.isActive;

    if (reminder.isActive) {
      reminder.nextTriggerTime = Date.now() + reminder.intervalMinutes * 60000;
      this.scheduleReminder(reminder);
    } else {
      this.cancelReminder(reminder.id);
      reminder.nextTriggerTime = null;
      reminder.isSnoozed = false;
    }

    this.saveReminders();
    this.updateWebview();
  }

  private scheduleReminder(reminder: Reminder) {
    this.cancelReminder(reminder.id);
    if (!reminder.nextTriggerTime) {
      return;
    }

    const timeUntilTrigger = reminder.nextTriggerTime - Date.now();

    console.log(
      `Scheduling reminder "${reminder.text}" in ${timeUntilTrigger} ms`
    );

    if (timeUntilTrigger <= 0) {
      console.log(`Triggering Immediately`);
      this.triggerReminder(reminder);
      return;
    }

    const timer = setTimeout(() => {
      console.log(`Triggering Reminder: "${reminder.text}"`);
      this.triggerReminder(reminder);
    }, timeUntilTrigger);

    this.timers.set(reminder.id, timer);
  }

  private async triggerReminder(reminder: Reminder) {
    const action = await vscode.window.showInformationMessage(
      `Reminder: ${reminder.text}`,
      "Dismiss",
      "Pause",
      "Snooze (5 min)"
    );

    console.log(`User selected action: ${action}`);

    if (action === "Snooze (5 min)") {
      reminder.isSnoozed = true;
      reminder.nextTriggerTime = Date.now() + 5 * 60000;
      this.scheduleReminder(reminder);
    } else if (action === "Pause") {
      reminder.isActive = false;
      reminder.isSnoozed = false;
      reminder.nextTriggerTime = null;
      this.cancelReminder(reminder.id);
    } else {
      // Otherwise we dismiss
      reminder.isSnoozed = false;
      reminder.nextTriggerTime = Date.now() + reminder.intervalMinutes * 60000;
      this.scheduleReminder(reminder);
    }

    this.saveReminders();
    this.updateWebview();
  }

  private cancelReminder(id: string) {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }

  private deleteReminder(id: string) {
    this.cancelReminder(id);
    this.reminders = this.reminders.filter((r) => r.id !== id);
    this.saveReminders();
    this.updateWebview();
  }

  private updateWebview() {
    if (this._view) {
      this._view.webview.postMessage({
        type: "updateReminders",
        reminders: this.reminders,
      });
    }
  }

  private saveReminders() {
    this._context.globalState.update("reminders", this.reminders);
  }

  private loadReminders() {
    const saved = this._context.globalState.get<Reminder[]>("reminders");
    this.reminders = saved || [];

    for (const reminder of this.reminders) {
      if (reminder.isActive && !reminder.isSnoozed) {
        this.scheduleReminder(reminder);
      }
    }
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
}
