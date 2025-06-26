import * as vscode from 'vscode';
import { ChatPanelProvider } from './chatPanelProvider';
import { FileManager } from './fileManager';
import { AIService } from './aiService';

export function activate(context: vscode.ExtensionContext) {
    console.log('AI Code Assistant extension is now active!');

    // Initialize services
    const fileManager = new FileManager();
    const aiService = new AIService();
    
    // Create providers for both sidebar and panel views
    const sidebarProvider = new ChatPanelProvider(context.extensionUri, aiService, fileManager);
    const panelProvider = new ChatPanelProvider(context.extensionUri, aiService, fileManager);

    // Register the webview providers
    const sidebarWebviewProvider = vscode.window.registerWebviewViewProvider(
        'code-assistant.chatView', // Sidebar view
        sidebarProvider,
        {
            webviewOptions: {
                retainContextWhenHidden: true
            }
        }
    );

    const panelWebviewProvider = vscode.window.registerWebviewViewProvider(
        'code-assistant.chatPanel', // Panel view
        panelProvider,
        {
            webviewOptions: {
                retainContextWhenHidden: true
            }
        }
    );

    // Register the command to open chat (focuses the panel by default)
    const openChatCommand = vscode.commands.registerCommand('code-assistant.openChat', () => {
        console.log('Open chat command triggered');
        // Focus the panel view for more space
        vscode.commands.executeCommand('code-assistant.chatPanel.focus');
    });

    // Register additional commands for better UX
    const focusChatCommand = vscode.commands.registerCommand('code-assistant.focusChat', () => {
        console.log('Focus chat command triggered');
        // Focus the panel view by default
        vscode.commands.executeCommand('code-assistant.chatPanel.focus');
    });

    // Command to specifically open sidebar chat
    const openSidebarChatCommand = vscode.commands.registerCommand('code-assistant.openSidebarChat', () => {
        console.log('Open sidebar chat command triggered');
        vscode.commands.executeCommand('code-assistant.chatView.focus');
    });

    // Command to specifically open panel chat
    const openPanelChatCommand = vscode.commands.registerCommand('code-assistant.openPanelChat', () => {
        console.log('Open panel chat command triggered');
        vscode.commands.executeCommand('code-assistant.chatPanel.focus');
    });

    // Add to subscriptions
    context.subscriptions.push(sidebarWebviewProvider);
    context.subscriptions.push(panelWebviewProvider);
    context.subscriptions.push(openChatCommand);
    context.subscriptions.push(focusChatCommand);
    context.subscriptions.push(openSidebarChatCommand);
    context.subscriptions.push(openPanelChatCommand);

    // Show welcome message
    vscode.window.showInformationMessage('AI Code Assistant is ready! Use Ctrl+Shift+P and search "AI Code Assistant" to open it.');
}

export function deactivate() {
    console.log('AI Code Assistant extension is deactivated.');
}