import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface FileInfo {
    path: string;
    fullPath: string;
    name: string;
    extension: string;
    isImage: boolean;
    size?: number;
    lastModified?: Date;
}

export class FileManager {
    private readonly imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp', '.ico'];
    private readonly textExtensions = [
        '.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.scss', '.less',
        '.json', '.xml', '.yaml', '.yml', '.md', '.txt', '.py', '.java',
        '.c', '.cpp', '.h', '.cs', '.php', '.rb', '.go', '.rs', '.swift',
        '.kt', '.scala', '.sh', '.bat', '.ps1', '.sql', '.r', '.m', '.pl'
    ];

    async getWorkspaceFiles(query: string = '', limit: number = 50): Promise<FileInfo[]> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return [];
        }

        try {
            // Create a more flexible search pattern
            const searchPattern = query ? `**/*${query}*` : '**/*';
            const excludePattern = '**/node_modules/**';

            const files = await vscode.workspace.findFiles(
                searchPattern,
                excludePattern,
                limit
            );

            const fileInfos: FileInfo[] = [];

            for (const file of files) {
                const relativePath = vscode.workspace.asRelativePath(file);
                const extension = path.extname(file.fsPath).toLowerCase();
                
                // Skip very large files and binary files we can't handle
                if (this.shouldIncludeFile(file.fsPath, extension)) {
                    fileInfos.push({
                        path: relativePath,
                        fullPath: file.fsPath,
                        name: path.basename(file.fsPath),
                        extension: extension,
                        isImage: this.imageExtensions.includes(extension)
                    });
                }
            }

            // Sort by relevance (exact matches first, then alphabetical)
            return fileInfos.sort((a, b) => {
                if (query) {
                    const aExact = a.name.toLowerCase().includes(query.toLowerCase());
                    const bExact = b.name.toLowerCase().includes(query.toLowerCase());
                    if (aExact && !bExact) return -1;
                    if (!aExact && bExact) return 1;
                }
                return a.path.localeCompare(b.path);
            });

        } catch (error) {
            console.error('Error searching workspace files:', error);
            return [];
        }
    }

    async readFileContent(filePath: string): Promise<string> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            throw new Error('No workspace folder open');
        }

        try {
            let fullPath: string;
            
            if (path.isAbsolute(filePath)) {
                fullPath = filePath;
            } else {
                // Try to find the file in any workspace folder
                fullPath = await this.resolveFilePath(filePath);
            }

            // Check if it's an image file
            if (this.isImageFile(fullPath)) {
                return this.getImageMetadata(fullPath);
            }

            // Read text file
            const document = await vscode.workspace.openTextDocument(fullPath);
            return document.getText();

        } catch (error) {
            throw new Error(`Could not read file '${filePath}': ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private async resolveFilePath(relativePath: string): Promise<string> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            throw new Error('No workspace folder');
        }

        // Try each workspace folder
        for (const folder of workspaceFolders) {
            const fullPath = path.join(folder.uri.fsPath, relativePath);
            try {
                await fs.promises.access(fullPath);
                return fullPath;
            } catch {
                // Continue to next workspace folder
            }
        }

        // If not found in any workspace folder, try to find it by searching
        const files = await vscode.workspace.findFiles(`**/${path.basename(relativePath)}`);
        const exactMatch = files.find(file => 
            vscode.workspace.asRelativePath(file) === relativePath
        );

        if (exactMatch) {
            return exactMatch.fsPath;
        }

        throw new Error(`File not found: ${relativePath}`);
    }

    private shouldIncludeFile(filePath: string, extension: string): boolean {
        // Include text files and images
        if (this.textExtensions.includes(extension) || this.imageExtensions.includes(extension)) {
            return true;
        }

        // Include files without extension that might be text (like README, Dockerfile, etc.)
        if (!extension) {
            const filename = path.basename(filePath).toLowerCase();
            const textFilenames = ['readme', 'dockerfile', 'makefile', 'license', 'changelog'];
            return textFilenames.some(name => filename.includes(name));
        }

        return false;
    }

    isImageFile(filePath: string): boolean {
        const extension = path.extname(filePath).toLowerCase();
        return this.imageExtensions.includes(extension);
    }

    private getImageMetadata(filePath: string): string {
        const name = path.basename(filePath);
        const extension = path.extname(filePath);
        
        try {
            const stats = fs.statSync(filePath);
            return `[Image: ${name}]
Type: ${extension.substring(1).toUpperCase()}
Size: ${this.formatFileSize(stats.size)}
Path: ${filePath}
Modified: ${stats.mtime.toLocaleDateString()}

This is an image file. I can see the file metadata but cannot directly analyze the image content. If you need image analysis, please describe what you'd like me to help you with regarding this image.`;
        } catch (error) {
            return `[Image: ${name}]
Type: ${extension.substring(1).toUpperCase()}
Path: ${filePath}

This is an image file. I can reference it in our conversation but cannot directly analyze the image content.`;
        }
    }

    private formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async getWorkspaceContext(): Promise<string> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return 'No workspace folder open';
        }

        let context = '';

        // Add workspace folder info
        context += `Workspace: ${workspaceFolders[0].name}\n`;
        context += `Path: ${workspaceFolders[0].uri.fsPath}\n`;

        // Add active editor info
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            const fileName = path.basename(activeEditor.document.fileName);
            const language = activeEditor.document.languageId;
            const selectedText = activeEditor.document.getText(activeEditor.selection);
            
            context += `\nActive file: ${fileName} (${language})\n`;
            
            if (selectedText && selectedText.trim()) {
                context += `Selected text:\n\`\`\`${language}\n${selectedText}\n\`\`\`\n`;
            }

            // Add cursor position
            const position = activeEditor.selection.active;
            context += `Cursor position: Line ${position.line + 1}, Column ${position.character + 1}\n`;
        }

        // Add recently opened files
        try {
            const recentFiles = await this.getRecentFiles();
            if (recentFiles.length > 0) {
                context += `\nRecently opened files:\n`;
                recentFiles.slice(0, 5).forEach(file => {
                    context += `- ${file}\n`;
                });
            }
        } catch (error) {
            // Ignore errors getting recent files
        }

        return context;
    }

    private async getRecentFiles(): Promise<string[]> {
        // This is a simplified version - in a real implementation,
        // you might want to track recently opened files more comprehensively
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return [];
        }

        try {
            const files = await vscode.workspace.findFiles('**/*.{js,ts,jsx,tsx,py,java,c,cpp,cs,php,rb,go}', '**/node_modules/**', 10);
            return files.map(file => vscode.workspace.asRelativePath(file));
        } catch (error) {
            return [];
        }
    }

    async createFile(filePath: string, content: string): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            throw new Error('No workspace folder open');
        }

        try {
            const fullPath = path.isAbsolute(filePath) 
                ? filePath 
                : path.join(workspaceFolders[0].uri.fsPath, filePath);

            // Ensure directory exists
            const dir = path.dirname(fullPath);
            await fs.promises.mkdir(dir, { recursive: true });

            // Write file
            await fs.promises.writeFile(fullPath, content, 'utf8');

            // Open the file in VS Code
            const document = await vscode.workspace.openTextDocument(fullPath);
            await vscode.window.showTextDocument(document);

        } catch (error) {
            throw new Error(`Could not create file '${filePath}': ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    getLanguageFromFile(filePath: string): string {
        const extension = path.extname(filePath).toLowerCase();
        const languageMap: { [key: string]: string } = {
            '.js': 'javascript',
            '.ts': 'typescript',
            '.jsx': 'javascript',
            '.tsx': 'typescript',
            '.py': 'python',
            '.java': 'java',
            '.c': 'c',
            '.cpp': 'cpp',
            '.cs': 'csharp',
            '.php': 'php',
            '.rb': 'ruby',
            '.go': 'go',
            '.rs': 'rust',
            '.swift': 'swift',
            '.kt': 'kotlin',
            '.scala': 'scala',
            '.html': 'html',
            '.css': 'css',
            '.scss': 'scss',
            '.json': 'json',
            '.xml': 'xml',
            '.yaml': 'yaml',
            '.yml': 'yaml',
            '.md': 'markdown',
            '.sh': 'bash',
            '.sql': 'sql'
        };

        return languageMap[extension] || 'text';
    }
}