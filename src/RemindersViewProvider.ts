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
  ) {
    this.loadReminders();
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
      switch (data.type) {
        case "addReminder":
          this.addReminder(data.text, data.intervalMinutes);
          break;
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

    setTimeout(() => {
      this.updateWebview();
    }, 100);
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
      console.log(
        `No next trigger time for reminder "${reminder.text}", not scheduling.`
      );
      return;
    }

    const timeUntilTrigger = reminder.nextTriggerTime - Date.now();

    console.log(
      `Scheduling reminder "${
        reminder.text
      }" in ${timeUntilTrigger} ms (${Math.round(
        timeUntilTrigger / 60000
      )} minutes)`
    );

    if (timeUntilTrigger <= 0) {
      console.log(`Triggering Immediately`);
      this.triggerReminder(reminder);
      return;
    }

    const timer = setTimeout(() => {
      console.log(`Timer fired! Triggering reminder "${reminder.text}".`);
      this.triggerReminder(reminder);
    }, timeUntilTrigger);

    this.timers.set(reminder.id, timer);
    console.log(
      `Timer set for reminder "${reminder.text}" with ID ${reminder.id}.`
    );
  }

  // private async triggerReminder(reminder: Reminder) {
  //   const quickPick = vscode.window.createQuickPick();
  //   quickPick.title = "Reminder";
  //   quickPick.placeholder = reminder.text;
  //   quickPick.items = [
  //     {
  //       label: "Dismiss",
  //       description: "Resume in" + ` ${reminder.intervalMinutes} min`,
  //     },
  //     { label: "Pause", description: "Pause this reminder" },
  //     { label: "Snooze (5 min)", description: "Snooze for 5 minutes" },
  //   ];

  //   quickPick.show();

  //   const selection = await new Promise<vscode.QuickPickItem | undefined>(
  //     (resolve) => {
  //       quickPick.onDidAccept(() => {
  //         resolve(quickPick.selectedItems[0]);
  //         quickPick.hide();
  //         quickPick.dispose();
  //       });
  //       quickPick.onDidHide(() => {
  //         resolve(undefined);
  //         quickPick.dispose();
  //       });
  //     }
  //   );

  //   console.log(`User selected action: ${selection?.label}`);

  //   if (selection?.label === "Snooze (5 min)") {
  //     console.log(`Snoozing reminder for 5 minutes.`);
  //     reminder.isSnoozed = true;
  //     reminder.nextTriggerTime = Date.now() + 5 * 60000;
  //     this.scheduleReminder(reminder);
  //   } else if (selection?.label === "Pause") {
  //     console.log(`Pausing reminder.`);
  //     reminder.isActive = false;
  //     reminder.isSnoozed = false;
  //     reminder.nextTriggerTime = null;
  //     this.cancelReminder(reminder.id);
  //   } else if (selection?.label === "Dismiss") {
  //     console.log(`Dismissing reminder.`);
  //     reminder.isSnoozed = false;
  //     reminder.nextTriggerTime = Date.now() + reminder.intervalMinutes * 60000;
  //     this.scheduleReminder(reminder);
  //   } else {
  //     console.log(`No action selected, rescheduling reminder.`);
  //     reminder.isSnoozed = false;
  //     reminder.nextTriggerTime = Date.now() + reminder.intervalMinutes * 60000;
  //     this.scheduleReminder(reminder);
  //   }
  //   this.saveReminders();
  //   this.updateWebview();
  // }

  private async triggerReminder(reminder: Reminder) {
    let action;
    try {
      console.log("Showing reminder notification.");

      const timeoutPromise = new Promise<undefined>((resolve) => {
        setTimeout(() => {
          console.log("Notification timeout reached.");
          resolve(undefined);
        }, 10000);
      });

      const notificationPromise = vscode.window.showInformationMessage(
        `Reminder: ${reminder.text}`,
        "Dismiss",
        "Pause",
        "Snooze (5 min)"
      );

      action = await Promise.race([
        Promise.resolve(notificationPromise),
        timeoutPromise,
      ]);

      console.log(`Notification closed with action: ${action}`);
    } catch {
      console.log("Notification was dismissed without action.");
      action = undefined;
    }

    console.log(`User selected action: ${action}`);

    if (action === "Snooze (5 min)") {
      console.log(`Snoozing reminder for 5 minutes.`);
      reminder.isSnoozed = true;
      reminder.nextTriggerTime = Date.now() + 5 * 60000;
      this.scheduleReminder(reminder);
    } else if (action === "Pause") {
      console.log(`Pausing reminder.`);
      reminder.isActive = false;
      reminder.isSnoozed = false;
      reminder.nextTriggerTime = null;
      this.cancelReminder(reminder.id);
    } else if (action === "Dismiss") {
      console.log(`Dismissing reminder.`);
      reminder.isSnoozed = false;
      reminder.nextTriggerTime = Date.now() + reminder.intervalMinutes * 60000;
      this.scheduleReminder(reminder);
    } else {
      console.log(`No action selected, rescheduling reminder.`);
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
      console.log(`Updating webview with ${this.reminders.length} reminders.`);
      this._view.webview.postMessage({
        type: "updateReminders",
        reminders: this.reminders,
      });
    } else {
      console.log("Webview is not available to update.");
    }
  }

  private saveReminders() {
    this._context.globalState.update("reminders", this.reminders);
  }

  private loadReminders() {
    const saved = this._context.globalState.get<Reminder[]>("reminders");
    this.reminders = saved || [];

    console.log(`Loaded ${this.reminders.length} reminders from storage.`);

    for (const reminder of this.reminders) {
      if (reminder.isActive && reminder.nextTriggerTime) {
        // Check if should have already triggered
        if (reminder.nextTriggerTime <= Date.now()) {
          if (!reminder.isSnoozed) {
            reminder.nextTriggerTime =
              Date.now() + reminder.intervalMinutes * 60000;
          }
        }
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
