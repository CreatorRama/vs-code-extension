import * as vscode from 'vscode';
import * as path from 'path';
import axios from 'axios';
import { AIService } from './aiService';
import { FileManager } from './fileManager';

export class ChatPanelProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'code-assistant.chatView';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly aiService: AIService,
        private readonly fileManager: FileManager
    ) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'sendMessage':
                        await this._handleChatMessage(message.text, message.attachedFiles);
                        break;
                    case 'getWorkspaceFiles':
                        await this._getWorkspaceFiles(message.query);
                        break;
                    case 'getFileContent':
                        await this._getFileContent(message.filePath);
                        break;
                }
            },
            undefined,
            []
        );
    }

    public createOrShow() {
        if (this._view) {
            this._view.show?.(true);
            vscode.commands.executeCommand('code-assistant.chatView.focus');
        } else {
            vscode.commands.executeCommand('code-assistant.chatView.focus');
            vscode.commands.executeCommand('workbench.view.explorer');
            setTimeout(() => {
                vscode.commands.executeCommand('code-assistant.chatView.focus');
            }, 100);
        }
    }

    private async _handleChatMessage(text: string, attachedFiles: string[]) {
        try {
            // Extract and validate file references
            const fileReferences = this._extractFileReferences(text)
                .filter(ref => ref.length > 0); // Remove empty references

            // Find actual files for references
            const resolvedFiles = (await Promise.all(
                fileReferences.map(async ref => {
                    try {
                        const files = await this._findFilesInWorkspace(ref);
                        return files[0]?.fsPath; // Take first match
                    } catch {
                        return undefined;
                    }
                })
            )).filter((filePath): filePath is string => !!filePath); // Type guard to remove undefined

            // Combine with explicitly attached files
            const allFiles = [...new Set([
                ...attachedFiles,
                ...resolvedFiles
            ])];

            // Process file contents
            const fileContents = await Promise.all(
                allFiles.map(async filePath => ({
                    path: vscode.workspace.asRelativePath(filePath),
                    content: await this._readFileContent(filePath)
                }))
            );

            // Build enhanced prompt
            let prompt = text;
            if (fileContents.length > 0) {
                prompt += '\n\n=== Referenced Files ===\n';
                fileContents.forEach(file => {
                    prompt += `\n// File: ${file.path}\n` +
                        `// Language: ${this._getFileLanguage(file.path)}\n` +
                        `\`\`\`\n${file.content}\n\`\`\`\n`;
                });
            }

            // Call AI API
            const response = await this._callAI(prompt);

            // Send response back to webview
            this._view?.webview.postMessage({
                command: 'aiResponse',
                text: response,
                referencedFiles: allFiles
            });

        } catch (error) {
            this._view?.webview.postMessage({
                command: 'error',
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        }
    }

    private async _findFilesInWorkspace(query: string): Promise<vscode.Uri[]> {
        const pattern = `**/${query}`;
        return await vscode.workspace.findFiles(
            pattern,
            '**/node_modules/**',
            5
        );
    }

    private _getFileLanguage(filePath: string): string {
        const ext = path.extname(filePath).toLowerCase();
        const langMap: Record<string, string> = {
            '.js': 'JavaScript',
            '.jsx': 'JSX',
            '.ts': 'TypeScript',
            '.tsx': 'TSX',
            '.css': 'CSS',
            '.scss': 'SCSS',
            '.html': 'HTML',
            '.json': 'JSON'
        };
        return langMap[ext] || ext.substring(1).toUpperCase();
    }
    private _extractFileReferences(text: string): string[] {
        // Match @ followed by path (allowing letters, numbers, ./_- and common file extensions)
        const fileRefRegex = /@([a-zA-Z0-9./_-]+(?:\.(js|jsx|ts|tsx|css|scss|json|html))?)/g;
        const matches = new Set<string>();
        let match;

        while ((match = fileRefRegex.exec(text)) !== null) {
            // Remove any trailing punctuation or spaces from the match
            const cleanPath = match[1].replace(/[.,;!?]*$/, '');
            matches.add(cleanPath);
        }

        return Array.from(matches);
    }
    private async _callAI(prompt: string): Promise<string> {
        const config = vscode.workspace.getConfiguration('aiCodeAssistant');
        const apiKey = config.get<string>('apiKey');
        const apiUrl = config.get<string>('apiUrl');

        if (!apiKey) {
            throw new Error('Please set your DeepSeek API key in settings');
        }

        const response = await axios.post(
            apiUrl || 'https://api.deepseek.com/v1/chat/completions',
            {
                model: 'deepseek-coder',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an AI code assistant. Help users with code generation, debugging, and explanations. Provide clear, well-commented code and detailed explanations.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 2048,
                temperature: 0.1
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data.choices[0].message.content;
    }

  

    // IMPROVED: Better file search with path handling
    private async _getWorkspaceFiles(query: string) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return;
        }

        try {
            let files: vscode.Uri[] = [];
            const normalizedQuery = query.replace(/\\/g, '/').toLowerCase();

            // Split query into path parts
            const queryParts = normalizedQuery.split('/');
            const filename = queryParts[queryParts.length - 1];

            // Search patterns to try
            const patterns = [
                `**/${normalizedQuery}`,          // Exact path match
                `**/${filename}`,                  // Just the filename
                `**/*${filename}*`,                // Contains filename
                `**/${filename}.*`,                // Exact name with any extension
                `**/*${filename}.*`               // Contains filename with any extension
            ];

            // Search with each pattern
            for (const pattern of patterns) {
                const foundFiles = await vscode.workspace.findFiles(
                    pattern,
                    '**/node_modules/**',
                    20
                );
                files.push(...foundFiles);
            }

            // Remove duplicates
            const uniqueFiles = Array.from(new Set(files.map(f => f.fsPath)))
                .map(fsPath => files.find(f => f.fsPath === fsPath)!)
                .filter(Boolean);

            // Convert to file list with better path handling
            const fileList = uniqueFiles.map(file => {
                const relativePath = vscode.workspace.asRelativePath(file);
                return {
                    path: relativePath,
                    fullPath: file.fsPath,
                    name: path.basename(file.fsPath),
                    directory: path.dirname(relativePath)
                };
            });

            // Sort by relevance
            fileList.sort((a, b) => {
                // Exact path match gets highest priority
                const aExact = a.path.toLowerCase() === normalizedQuery;
                const bExact = b.path.toLowerCase() === normalizedQuery;
                if (aExact && !bExact) return -1;
                if (!aExact && bExact) return 1;

                // Then prioritize matches in the expected directory structure
                const aDirMatch = a.path.toLowerCase().includes(normalizedQuery);
                const bDirMatch = b.path.toLowerCase().includes(normalizedQuery);
                if (aDirMatch && !bDirMatch) return -1;
                if (!aDirMatch && bDirMatch) return 1;

                // Then sort by path length (shorter paths are likely more relevant)
                return a.path.length - b.path.length;
            });

            this._view?.webview.postMessage({
                command: 'workspaceFiles',
                files: fileList.slice(0, 20) // Limit results
            });

        } catch (error) {
            console.error('Error searching workspace files:', error);
            this._view?.webview.postMessage({
                command: 'workspaceFiles',
                files: []
            });
        }
    }

    // NEW: Calculate file relevance score
    private _calculateRelevance(file: { path: string; name: string; directory: string }, query: string): number {
        let score = 0;
        const lowerQuery = query.toLowerCase();
        const lowerPath = file.path.toLowerCase();
        const lowerName = file.name.toLowerCase();
        const lowerDir = file.directory.toLowerCase();

        // Exact path match gets highest score
        if (lowerPath === lowerQuery) {
            score += 1000;
        }

        // Path contains the full query (partial path match)
        if (lowerPath.includes(lowerQuery)) {
            score += 500;
        }

        // Directory contains part of the query path
        if (lowerDir.includes(lowerQuery)) {
            score += 300;
        }

        // Exact name match
        if (lowerName === path.basename(lowerQuery)) {
            score += 200;
        }

        // Name starts with query
        if (lowerName.startsWith(path.basename(lowerQuery))) {
            score += 100;
        }

        // Name contains query
        if (lowerName.includes(path.basename(lowerQuery))) {
            score += 50;
        }

        // Bonus for common file types
        const ext = path.extname(file.name).toLowerCase();
        const commonExtensions = ['.js', '.jsx', '.ts', '.tsx', '.vue', '.py', '.java', '.c', '.cpp'];
        if (commonExtensions.includes(ext)) {
            score += 20;
        }

        return score;
    }

    private async _getFileContent(filePath: string) {
        try {
            const content = await this._readFileContent(filePath);
            this._view?.webview.postMessage({
                command: 'fileContent',
                filePath,
                content
            });
        } catch (error) {
            this._view?.webview.postMessage({
                command: 'error',
                text: `Could not read file: ${filePath}`
            });
        }
    }

    private async _readFileContent(filePath: string): Promise<string> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            throw new Error('No workspace folder');
        }

        const fullPath = path.isAbsolute(filePath)
            ? filePath
            : path.join(workspaceFolders[0].uri.fsPath, filePath);

        if (this._isImageFile(filePath)) {
            return `[Image file: ${path.basename(filePath)}]`;
        }

        const document = await vscode.workspace.openTextDocument(fullPath);
        return document.getText();
    }

    private _isImageFile(filePath: string): boolean {
        const ext = path.extname(filePath).toLowerCase();
        return ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg'].includes(ext);
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>AI Code Assistant</title>
            <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
            <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
            <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-core.min.js"></script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js"></script>
            <link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css" rel="stylesheet" />
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: var(--vscode-editor-background);
                    color: var(--vscode-editor-foreground);
                    height: 100vh;
                    overflow: hidden;
                }
                #root {
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                }
                .chat-container {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                }
                .messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 16px;
                    scroll-behavior: smooth;
                }
                .message {
                    margin-bottom: 16px;
                    padding: 12px;
                    border-radius: 8px;
                    max-width: 85%;
                }
                .message.user {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    margin-left: auto;
                }
                .message.ai {
                    background: var(--vscode-editor-selectionBackground);
                    margin-right: auto;
                }
                .message pre {
                    background: var(--vscode-textCodeBlock-background);
                    padding: 12px;
                    border-radius: 4px;
                    overflow-x: auto;
                    margin: 8px 0;
                }
                .input-area {
                    border-top: 1px solid var(--vscode-panel-border);
                    padding: 16px;
                    background: var(--vscode-editor-background);
                }
                .input-container {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    position: relative;
                }
                .attached-files {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 4px;
                }
                .file-tag {
                    background: var(--vscode-badge-background);
                    color: var(--vscode-badge-foreground);
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .file-tag button {
                    background: none;
                    border: none;
                    color: inherit;
                    cursor: pointer;
                    padding: 0;
                    font-size: 14px;
                }
                .input-row {
                    display: flex;
                    gap: 8px;
                }
                textarea {
                    flex: 1;
                    background: var(--vscode-input-background);
                    border: 1px solid var(--vscode-input-border);
                    color: var(--vscode-input-foreground);
                    padding: 12px;
                    border-radius: 4px;
                    resize: none;
                    font-family: inherit;
                    min-height: 40px;
                }
                button {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 12px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-family: inherit;
                }
                button:hover {
                    background: var(--vscode-button-hoverBackground);
                }
                button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .suggestions {
                    position: absolute;
                    bottom: 100%;
                    left: 0;
                    right: 0;
                    background: var(--vscode-quickInput-background);
                    border: 1px solid var(--vscode-quickInput-border);
                    border-radius: 4px;
                    max-height: 300px;
                    overflow-y: auto;
                    z-index: 1000;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                }
                .suggestion {
                    padding: 8px 12px;
                    cursor: pointer;
                    border-bottom: 1px solid var(--vscode-quickInput-border);
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .suggestion:hover {
                    background: var(--vscode-list-hoverBackground);
                }
                .suggestion:last-child {
                    border-bottom: none;
                }
                .suggestion-path {
                    font-weight: 500;
                    font-size: 13px;
                }
                .suggestion-dir {
                    font-size: 11px;
                    opacity: 0.7;
                }

               .message-content {
    line-height: 1.6;
    white-space: pre-wrap;
}

.message-content p {
    margin: 0.5em 0;
}

.message-content code:not(pre code) {
    background: var(--vscode-textCodeBlock-background);
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-family: var(--vscode-editor-font-family);
    font-size: 0.9em;
}

.message-content pre {
    background: var(--vscode-textCodeBlock-background);
    padding: 1em;
    border-radius: 4px;
    overflow-x: auto;
    margin: 0.8em 0;
}

.message-content pre code {
    background: transparent;
    padding: 0;
    white-space: pre;
}

            </style>
        </head>
        <body>
            <div id="root"></div>
            <script type="text/babel">
                const { useState, useEffect, useRef } = React;

                const vscode = acquireVsCodeApi();

                function ChatApp() {
                    const [messages, setMessages] = useState([]);
                    const [input, setInput] = useState('');
                    const [attachedFiles, setAttachedFiles] = useState([]);
                    const [isLoading, setIsLoading] = useState(false);
                    const [suggestions, setSuggestions] = useState([]);
                    const [showSuggestions, setShowSuggestions] = useState(false);
                    const messagesEndRef = useRef(null);
                    const textareaRef = useRef(null);

                    useEffect(() => {
                        const handleMessage = (event) => {
                            const message = event.data;
                            switch (message.command) {
                                case 'aiResponse':
                                    setMessages(prev => [...prev, { type: 'ai', content: message.text }]);
                                    setIsLoading(false);
                                    break;
                                case 'error':
                                    setMessages(prev => [...prev, { type: 'ai', content: message.text }]);
                                    setIsLoading(false);
                                    break;
                                case 'workspaceFiles':
                                    setSuggestions(message.files);
                                    setShowSuggestions(message.files.length > 0);
                                    break;
                            }
                        };

                        window.addEventListener('message', handleMessage);
                        return () => window.removeEventListener('message', handleMessage);
                    }, []);

                    useEffect(() => {
                        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                         if (window.Prism) {
        window.Prism.highlightAll();
    }
                    }, [messages]);


                    const handleInputChange = (e) => {
                        const value = e.target.value;
                        setInput(value);

                        // Check for @ mentions
                        const cursorPosition = e.target.selectionStart;
                        const textBeforeCursor = value.substring(0, cursorPosition);
                        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
                        
                        if (lastAtIndex !== -1) {
                            const query = textBeforeCursor.substring(lastAtIndex + 1);
                            if (query.length >= 0) {
                                vscode.postMessage({
                                    command: 'getWorkspaceFiles',
                                    query: query
                                });
                            }
                        } else {
                            setShowSuggestions(false);
                        }
                    };

                    const handleSuggestionClick = (file) => {
                        const cursorPosition = textareaRef.current.selectionStart;
                        const textBeforeCursor = input.substring(0, cursorPosition);
                        const textAfterCursor = input.substring(cursorPosition);
                        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
                        
                        const newText = textBeforeCursor.substring(0, lastAtIndex + 1) + file.path + ' ' + textAfterCursor;
                        setInput(newText);
                        setShowSuggestions(false);
                        
                        if (!attachedFiles.includes(file.path)) {
                            setAttachedFiles(prev => [...prev, file.path]);
                        }
                        
                        textareaRef.current.focus();
                    };

                    const removeAttachedFile = (filePath) => {
                        setAttachedFiles(prev => prev.filter(f => f !== filePath));
                    };

                    const sendMessage = () => {
                        if (!input.trim() && attachedFiles.length === 0) return;

                        const userMessage = { type: 'user', content: input, attachedFiles: [...attachedFiles] };
                        setMessages(prev => [...prev, userMessage]);
                        setIsLoading(true);

                        vscode.postMessage({
                            command: 'sendMessage',
                            text: input,
                            attachedFiles: attachedFiles
                        });

                        setInput('');
                        setAttachedFiles([]);
                        setShowSuggestions(false);
                    };

                    const handleKeyPress = (e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                        }
                    };

                    
const renderMessage = (message, index) => {
    let content = message.content;
    
    // Split content into parts: code blocks and normal text
    const parts = content.split(/(\`\`\`[\\s\\S]*?\`\`\`|\`[^\`]+\`)/);
    
    content = parts.map((part, i) => {
        if (part.startsWith('\`\`\`')) {
            // Handle multi-line code blocks
            const code = part.replace(/^\`\`\`[\\w]*\\n?/, '').replace(/\`\`\`$/, '');
            const languageMatch = part.match(/^\`\`\`(\\w+)/);
            const language = languageMatch ? \`language-\${languageMatch[1]}\` : '';
            
            return React.createElement('pre', { key: i }, 
                React.createElement('code', { className: language }, code)
            );
        } else if (part.startsWith('\`') && part.endsWith('\`')) {
            // Handle inline code
            const inlineCode = part.slice(1, -1);
            return React.createElement('code', { key: i }, inlineCode);
        } else {
            // Handle normal text with line breaks and basic formatting
            const paragraphs = part.split('\\n\\n').map((para, j) => 
                React.createElement('p', { key: \`para-\${j}\` }, para)
            );
            return React.createElement('div', { key: i }, paragraphs);
        }
    });

    return React.createElement('div', { 
        key: index, 
        className: \`message \${message.type}\`
    }, [
        (message.attachedFiles || message.referencedFiles) && 
        (message.attachedFiles?.length > 0 || message.referencedFiles?.length > 0) && 
        React.createElement('div', { key: 'files', style: { marginBottom: '8px', fontSize: '12px', opacity: 0.8 } },
            'Referenced: ' + [...(message.attachedFiles || []), ...(message.referencedFiles || [])].join(', ')
        ),
        React.createElement('div', { key: 'content', className: 'message-content' }, content)
    ]);
};

                    return React.createElement('div', { className: 'chat-container' }, [
                        React.createElement('div', { key: 'messages', className: 'messages' }, [
                            ...messages.map(renderMessage),
                            isLoading && React.createElement('div', { 
                                key: 'loading', 
                                className: 'message ai' 
                            }, '🤔 Thinking...'),
                            React.createElement('div', { key: 'end', ref: messagesEndRef })
                        ]),
                        React.createElement('div', { key: 'input', className: 'input-area' }, 
                            React.createElement('div', { className: 'input-container' }, [
                                attachedFiles.length > 0 && React.createElement('div', { 
                                    key: 'attached', 
                                    className: 'attached-files' 
                                }, attachedFiles.map(file => 
                                    React.createElement('div', { key: file, className: 'file-tag' }, [
                                        file,
                                        React.createElement('button', { 
                                            onClick: () => removeAttachedFile(file),
                                            title: 'Remove file'
                                        }, '×')
                                    ])
                                )),
                                showSuggestions && suggestions.length > 0 && React.createElement('div', { 
                                    key: 'suggestions', 
                                    className: 'suggestions' 
                                }, suggestions.map(file => 
                                    React.createElement('div', { 
                                        key: file.path, 
                                        className: 'suggestion',
                                        onClick: () => handleSuggestionClick(file)
                                    }, [
                                        React.createElement('div', { className: 'suggestion-path' }, file.name),
                                        React.createElement('div', { className: 'suggestion-dir' }, file.directory)
                                    ])
                                )),
                                React.createElement('div', { key: 'input-row', className: 'input-row' }, [
                                    React.createElement('textarea', {
                                        ref: textareaRef,
                                        value: input,
                                        onChange: handleInputChange,
                                        onKeyPress: handleKeyPress,
                                        placeholder: 'Ask about your code... (use @filename to attach files)',
                                        disabled: isLoading
                                    }),
                                    React.createElement('button', {
                                        onClick: sendMessage,
                                        disabled: isLoading || (!input.trim() && attachedFiles.length === 0)
                                    }, 'Send')
                                ])
                            ])
                        )
                    ]);
                }

                ReactDOM.render(React.createElement(ChatApp), document.getElementById('root'));
            </script>
        </body>
        </html>`;
    }
}