# AI Code Assistant

An intelligent VS Code extension that integrates DeepSeek AI to provide powerful coding assistance directly in your development environment. Get AI-powered code generation, explanations, reviews, and refactoring suggestions without leaving your editor.

## ✨ Features

- **AI-Powered Chat Interface**: Interactive chat panel and sidebar view for seamless AI conversations
- **Smart File Referencing**: Use `@filename` syntax to attach files to your queries
- **Code Generation**: Generate high-quality, well-commented code snippets
- **Code Explanation**: Get detailed explanations of complex code sections
- **Code Review**: Automated code review with best practice suggestions
- **Code Refactoring**: AI-assisted refactoring with detailed change explanations
- **Workspace Context**: AI understands your current workspace and active files
- **Multiple View Options**: Available in both sidebar and panel views for flexible workflow
- **Syntax Highlighting**: Beautiful code highlighting in chat responses

## 🚀 Installation

### From VS Code Marketplace
1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for "AI Code Assistant"
4. Click Install

### Manual Installation
1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run compile` to build the extension
4. Press `F5` to open a new VS Code window with the extension loaded

## ⚙️ Setup

### 1. Get DeepSeek API Key
1. Visit [DeepSeek Console](https://platform.deepseek.com/)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new API key

### 2. Configure Extension
1. Open VS Code Settings (`Ctrl+,`)
2. Search for "AI Code Assistant"
3. Configure the following settings:

```json
{
  "aiCodeAssistant.apiKey": "your-deepseek-api-key-here",
  "aiCodeAssistant.apiUrl": "https://api.deepseek.com/v1/chat/completions",
  "aiCodeAssistant.model": "deepseek-coder"
}
```

#### Configuration Options

| Setting | Description | Default | Options |
|---------|-------------|---------|---------|
| `aiCodeAssistant.apiKey` | Your DeepSeek API key (required) | `""` | String |
| `aiCodeAssistant.apiUrl` | DeepSeek API endpoint URL | `"https://api.deepseek.com/v1/chat/completions"` | String |
| `aiCodeAssistant.model` | AI model to use | `"deepseek-coder"` | `"deepseek-coder"`, `"deepseek-chat"` |

## 📖 Usage

### Opening the Assistant

**Method 1: Command Palette**
1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. Type "AI Code Assistant"
3. Select "Open AI Code Assistant"

**Method 2: Views**
- **Sidebar**: Look for "AI Code Assistant (Sidebar)" in the Explorer panel
- **Panel**: The assistant will appear in the bottom panel area

### Available Commands

| Command | Description | Shortcut |
|---------|-------------|----------|
| `AI Assistant: Open AI Code Assistant` | Opens the main chat interface | - |
| `AI Assistant: Focus AI Chat Panel` | Focuses the panel view | - |

### Smart File Referencing

Use the `@` symbol followed by a filename to attach files to your conversation:

```
@main.js Can you help me optimize this function?
@components/Button.tsx @styles/button.css How can I improve this component?
```

**Features:**
- **Auto-completion**: Type `@` and start typing a filename for suggestions
- **Fuzzy Search**: Finds files even with partial names
- **Path Intelligence**: Searches across your entire workspace
- **Visual Feedback**: Attached files are shown as tags in the interface

### Example Conversations

**Code Generation:**
```
User: Create a React component for a responsive navbar
AI: I'll create a responsive navbar component for you...
```

**Code Explanation:**
```
User: @utils/helpers.js Explain what the debounce function does
AI: Looking at your debounce function, it's a utility that limits how often a function can be called...
```

**Code Review:**
```
User: @api/userService.js Please review this code for potential issues
AI: I've analyzed your user service code. Here are my findings...
```

## 🖥️ Extension Host Setup

### Development Environment

The extension requires proper VS Code Extension Host configuration:

#### Prerequisites
- **Node.js**: Version 16.x or higher
- **VS Code**: Version 1.75.0 or higher
- **TypeScript**: Version 4.8.4 or higher

#### Project Structure
```
ai-code-assistant/
├── src/
│   ├── extension.ts          # Main extension entry point
│   ├── chatPanelProvider.ts  # Webview provider for chat interface
│   ├── fileManager.ts        # File system operations
│   └── aiService.ts          # AI API integration
├── package.json              # Extension manifest
├── tsconfig.json            # TypeScript configuration
└── README.md                # This file
```

#### Build Configuration

**TypeScript Configuration (`tsconfig.json`)**:
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2020",
    "outDir": "out",
    "lib": ["ES2020", "DOM"],
    "sourceMap": true,
    "rootDir": "src",
    "strict": true
  },
  "exclude": ["node_modules", ".vscode-test"]
}
```

**Package Scripts**:
```json
{
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "package": "vsce package",
    "publish": "vsce publish"
  }
}
```

### Extension Activation

The extension activates when VS Code starts and registers:

1. **Webview Providers**: For sidebar and panel chat interfaces
2. **Commands**: For opening and focusing chat views
3. **Configuration**: For API settings

### Webview Security

The extension implements secure webview practices:

- **Content Security Policy**: Restricts script execution
- **Local Resource Roots**: Limits file system access
- **Message Validation**: Validates all webview communications

## 🔧 Development

### Setting Up Development Environment

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd ai-code-assistant
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the extension**:
   ```bash
   npm run compile
   ```

4. **Run in development mode**:
   - Press `F5` in VS Code
   - This opens a new Extension Development Host window
   - Test your changes in the new window

### Testing

```bash
# Compile and lint
npm run pretest

# Run tests
npm test
```

### Building for Production

```bash
# Create .vsix package
npm run package

# Publish to marketplace
npm run publish
```

## 🏗️ Architecture

### Core Components

1. **Extension (`extension.ts`)**:
   - Entry point for the extension
   - Manages activation and deactivation
   - Registers commands and providers

2. **Chat Panel Provider (`chatPanelProvider.ts`)**:
   - Manages webview interface
   - Handles user interactions
   - Processes file attachments

3. **AI Service (`aiService.ts`)**:
   - Integrates with DeepSeek API
   - Formats prompts and responses
   - Handles different AI interaction types

4. **File Manager (`fileManager.ts`)**:
   - Manages workspace file operations
   - Provides file search and content reading
   - Handles different file types

### Data Flow

```
User Input → Chat Panel → File Manager → AI Service → DeepSeek API
     ↑                                                        ↓
User Interface ← Response Processing ← Response Formatting ← API Response
```

## 🔐 Security & Privacy

- **API Key Security**: API keys are stored in VS Code settings (not in code)
- **Local Processing**: File content is processed locally before sending to AI
- **No Data Storage**: No conversation history is stored permanently
- **Secure Communication**: All API calls use HTTPS

## 🐛 Troubleshooting

### Common Issues

**"API key not configured"**
- Solution: Set your DeepSeek API key in VS Code settings

**"Extension not appearing"**
- Solution: Check if the extension is enabled in Extensions panel
- Try reloading VS Code window (`Ctrl+Shift+P` → "Reload Window")

**"No response from AI"**
- Check your internet connection
- Verify API key is correct
- Check DeepSeek API status

**"File attachment not working"**
- Ensure the file exists in your workspace
- Check file permissions
- Try using relative paths

### Debug Mode

Enable debug logging:
1. Open VS Code settings
2. Search for "developer"
3. Enable "Developer: Reload With Extensions Disabled"
4. Check the Output panel for extension logs

## 📝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Support

- **Issues**: Report bugs and request features on [GitHub Issues](your-repo/issues)
- **Documentation**: Check our [Wiki](your-repo/wiki) for detailed guides
- **Community**: Join our [Discord](your-discord-link) for discussions

## 🙏 Acknowledgments

- [DeepSeek](https://deepseek.com/) for providing the AI API
- VS Code team for the excellent extension API
- React and TypeScript communities for the tools

---

**Made with ❤️ by Aman Pandey**