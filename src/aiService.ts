import axios, { AxiosResponse } from 'axios';
import * as vscode from 'vscode';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface AIResponse {
    choices: Array<{
        message: {
            content: string;
            role: string;
        };
        finish_reason: string;
    }>;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

export class AIService {
    private apiKey: string;
    private apiUrl: string;
    private model: string;

    constructor() {
        const config = vscode.workspace.getConfiguration('aiCodeAssistant');
        this.apiKey = config.get<string>('apiKey') || '';
        this.apiUrl = config.get<string>('apiUrl') || 'https://api.deepseek.com/v1/chat/completions';
        this.model = config.get<string>('model') || 'deepseek-coder';
    }

    async generateResponse(
        messages: ChatMessage[],
        options: {
            maxTokens?: number;
            temperature?: number;
            stream?: boolean;
        } = {}
    ): Promise<string> {
        if (!this.apiKey) {
            throw new Error('DeepSeek API key is not configured. Please set it in VS Code settings.');
        }

        const {
            maxTokens = 2048,
            temperature = 0.1,
            stream = false
        } = options;

        try {
            const response: AxiosResponse<AIResponse> = await axios.post(
                this.apiUrl,
                {
                    model: this.model,
                    messages: messages,
                    max_tokens: maxTokens,
                    temperature: temperature,
                    stream: stream,
                    stop: null
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    timeout: 30000 // 30 second timeout
                }
            );

            if (!response.data.choices || response.data.choices.length === 0) {
                throw new Error('No response generated from AI service');
            }

            return response.data.choices[0].message.content;

        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 401) {
                    throw new Error('Invalid API key. Please check your DeepSeek API key in settings.');
                } else if (error.response?.status === 429) {
                    throw new Error('Rate limit exceeded. Please try again later.');
                } else if (error.response?.status === 500) {
                    throw new Error('AI service is temporarily unavailable. Please try again later.');
                } else if (error.code === 'ECONNABORTED') {
                    throw new Error('Request timeout. Please try again.');
                } else {
                    throw new Error(`API Error: ${error.response?.data?.error?.message || error.message}`);
                }
            }
            throw error;
        }
    }

    createSystemPrompt(workspaceContext?: string): ChatMessage {
        let systemContent = `You are an expert AI code assistant integrated into VS Code. Your role is to:

1. Help users write, debug, and improve their code
2. Provide clear explanations of code concepts and implementations
3. Generate high-quality, well-commented code snippets
4. Suggest best practices and optimizations
5. Help with code reviews and refactoring

Guidelines:
- Always provide working, tested code when possible
- Include clear comments explaining complex logic
- Follow the coding style and conventions of the project
- Suggest modern, efficient solutions
- Be concise but thorough in explanations
- If you're unsure about something, ask for clarification`;

        if (workspaceContext) {
            systemContent += `\n\nCurrent workspace context:\n${workspaceContext}`;
        }

        return {
            role: 'system',
            content: systemContent
        };
    }

    formatCodeGenerationPrompt(
        userPrompt: string,
        attachedFiles: Array<{ path: string; content: string }>,
        workspaceContext?: string
    ): ChatMessage[] {
        const messages: ChatMessage[] = [];

        // Add system prompt
        messages.push(this.createSystemPrompt(workspaceContext));

        // Format user message with attached files
        let userContent = userPrompt;

        if (attachedFiles.length > 0) {
            userContent += '\n\nReferenced files:\n';
            attachedFiles.forEach(file => {
                userContent += `\n### ${file.path}\n\`\`\`\n${file.content}\n\`\`\`\n`;
            });
        }

        messages.push({
            role: 'user',
            content: userContent
        });

        return messages;
    }

    async generateCode(
        prompt: string,
        attachedFiles: Array<{ path: string; content: string }> = [],
        workspaceContext?: string
    ): Promise<string> {
        const messages = this.formatCodeGenerationPrompt(prompt, attachedFiles, workspaceContext);
        return await this.generateResponse(messages, {
            temperature: 0.1, // Lower temperature for more consistent code generation
            maxTokens: 2048
        });
    }

    async explainCode(
        code: string,
        context?: string
    ): Promise<string> {
        const messages: ChatMessage[] = [
            this.createSystemPrompt(),
            {
                role: 'user',
                content: `Please explain the following code in detail, including what it does, how it works, and any potential improvements:\n\n\`\`\`\n${code}\n\`\`\`${context ? `\n\nAdditional context: ${context}` : ''}`
            }
        ];

        return await this.generateResponse(messages, {
            temperature: 0.2,
            maxTokens: 1500
        });
    }

    async reviewCode(
        code: string,
        language?: string
    ): Promise<string> {
        const messages: ChatMessage[] = [
            this.createSystemPrompt(),
            {
                role: 'user',
                content: `Please review the following ${language || ''} code and provide feedback on:
1. Code quality and best practices
2. Potential bugs or issues
3. Performance optimizations
4. Security considerations
5. Suggestions for improvement

Code to review:
\`\`\`${language || ''}
${code}
\`\`\``
            }
        ];

        return await this.generateResponse(messages, {
            temperature: 0.2,
            maxTokens: 2000
        });
    }

    async refactorCode(
        code: string,
        requirements: string,
        language?: string
    ): Promise<string> {
        const messages: ChatMessage[] = [
            this.createSystemPrompt(),
            {
                role: 'user',
                content: `Please refactor the following ${language || ''} code based on these requirements: ${requirements}

Original code:
\`\`\`${language || ''}
${code}
\`\`\`

Please provide the refactored code with explanations of the changes made.`
            }
        ];

        return await this.generateResponse(messages, {
            temperature: 0.1,
            maxTokens: 2048
        });
    }
}