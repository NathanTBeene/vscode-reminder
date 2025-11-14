import * as vscode from "vscode";
import { RemindersViewProvider } from "./RemindersViewProvider";

export function activate(context: vscode.ExtensionContext) {
  // Register the webview provider for the reminder sidebar
  const provider = new RemindersViewProvider(context.extensionUri, context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      RemindersViewProvider.viewType,
      provider
    )
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
