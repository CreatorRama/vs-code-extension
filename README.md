# AI Code Assistant

An intelligent VS Code extension that integrates DeepSeek AI to provide advanced code assistance, generation, and analysis capabilities directly within your development environment.

## Features

- **Intelligent Code Chat**: Interactive chat interface with AI-powered code assistance
- **File Reference System**: Use `@filename` to reference and attach files to your conversations
- **Dual Interface**: Available in both sidebar and panel views for flexible workspace organization
- **Smart File Search**: Fuzzy file search with intelligent suggestions
- **Code Generation**: Generate high-quality, well-commented code snippets
- **Code Explanation**: Get detailed explanations of complex code
- **Code Review**: Automated code quality analysis and improvement suggestions
- **Multi-language Support**: Works with JavaScript, TypeScript, Python, Java, C++, and many more
- **Workspace Context**: AI understands your current workspace and active files

## Installation

1. Install the extension from the VS Code Marketplace
2. Configure your DeepSeek API key in settings
3. Start using the AI assistant!

## Setup

### 1. Get DeepSeek API Key

1. Visit [DeepSeek Platform](https://platform.deepseek.com/)
2. Create an account and generate an API key
3. Copy your API key for configuration

### 2. Configure Extension

Open VS Code settings (`Ctrl+,` or `Cmd+,`) and configure:

- **AI Code Assistant: Api Key**: Your DeepSeek API key (required)
- **AI Code Assistant: Api Url**: API endpoint (default: `https://api.deepseek.com/v1/chat/completions`)
- **AI Code Assistant: Model**: AI model to use (`deepseek-coder` or `deepseek-chat`)

Alternatively, you can set these in your `settings.json`:

```json
{
  "aiCodeAssistant.apiKey": "your-deepseek-api-key-here",
  "aiCodeAssistant.apiUrl": "https://api.deepseek.com/v1/chat/completions",
  "aiCodeAssistant.model": "deepseek-coder"
}
```

## Usage

### Opening the Assistant

- **Command Palette**: `Ctrl+Shift+P` → "Open AI Code Assistant"
- **Sidebar**: Find "AI Code Assistant (Sidebar)" in the Explorer panel
- **Panel**: Open the "AI Code Assistant" panel at the bottom

### Chat Interface

1. **Basic Chat**: Type your question or request in the chat input
2. **File References**: Use `@filename` to reference files in your workspace
   - Example: `@app.js explain this component`
   - Files are automatically attached and their content is included in the context
3. **File Attachment**: Click on suggested files or manually attach them

### Example Use Cases

#### Code Generation
```
Generate a React component for a user profile card with props for name, email, and avatar
```

#### Code Explanation
```
@utils.js explain the debounce function in this file
```

#### Code Review
```
@auth.js please review this authentication module for security issues
```

#### Debugging Help
```
@api.js I'm getting a 404 error when calling the login endpoint, can you help debug?
```

#### Refactoring Suggestions
```
@legacy-code.js suggest modern JavaScript patterns to refactor this code
```

## File Reference System

The extension features an intelligent file reference system:

- **Type `@` followed by filename**: Get autocomplete suggestions
- **Fuzzy Search**: Finds files even with partial names
- **Smart Matching**: Prioritizes exact matches and relevant files
- **Multiple References**: Reference multiple files in one message
- **Auto-attachment**: Referenced files are automatically included in the AI context

## Commands

| Command | Description |
|---------|-------------|
| `AI Assistant: Open AI Code Assistant` | Opens the main chat interface |
| `AI Assistant: Focus AI Chat Panel` | Focuses the chat panel |

## Supported File Types

- **Code Files**: `.js`, `.ts`, `.jsx`, `.tsx`, `.py`, `.java`, `.c`, `.cpp`, `.cs`, `.php`, `.rb`, `.go`, `.rs`, `.swift`, `.kt`, `.scala`
- **Web Files**: `.html`, `.css`, `.scss`, `.less`
- **Config Files**: `.json`, `.yaml`, `.yml`, `.xml`
- **Documentation**: `.md`, `.txt`
- **Images**: `.png`, `.jpg`, `.jpeg`, `.gif`, `.bmp`, `.svg`, `.webp` (metadata only)

## Configuration Options

| Setting | Description | Default |
|---------|-------------|---------|
| `aiCodeAssistant.apiKey` | DeepSeek API key (required) | `""` |
| `aiCodeAssistant.apiUrl` | API endpoint URL | `"https://api.deepseek.com/v1/chat/completions"` |
| `aiCodeAssistant.model` | AI model to use | `"deepseek-coder"` |

## Privacy & Security

- **Local Processing**: File content is processed locally and only sent to DeepSeek AI when explicitly referenced
- **API Security**: All API communications use HTTPS encryption
- **No Data Storage**: The extension doesn't store your code or conversations locally
- **Configurable**: You control which files are shared with the AI

## Troubleshooting

### Common Issues

1. **"Please set your DeepSeek API key"**
   - Configure your API key in VS Code settings
   - Ensure the key is valid and active

2. **"Rate limit exceeded"**
   - You've hit the API rate limit
   - Wait a few minutes before trying again

3. **File not found errors**
   - Ensure files exist in your workspace
   - Check file paths and spelling

4. **Empty responses**
   - Check your internet connection
   - Verify API key is correct
   - Try again with a simpler request

### Support

If you encounter issues:

1. Check the VS Code Developer Console (`Help` → `Toggle Developer Tools`)
2. Look for error messages in the console
3. Verify your API key and settings
4. Try reloading VS Code

## Requirements

- VS Code 1.75.0 or higher
- DeepSeek API key
- Internet connection

## Extension Settings

This extension contributes the following settings:

- `aiCodeAssistant.apiKey`: Your DeepSeek API key
- `aiCodeAssistant.apiUrl`: DeepSeek API endpoint
- `aiCodeAssistant.model`: AI model selection

## Known Issues

- Large files (>1MB) may cause performance issues
- Binary files are not supported for content analysis
- Image analysis is limited to metadata only

## Release Notes

### 0.0.1

- Initial release
- Basic chat interface with DeepSeek integration
- File reference system with `@filename` syntax
- Dual interface (sidebar and panel)
- Smart file search and attachment
- Code generation, explanation, and review features

## Contributing

This extension is open to contributions! Please feel free to:

- Report issues
- Suggest features
- Submit pull requests

## License

This project is licensed under the MIT License.

---

**Enjoy coding with AI assistance!** 🚀