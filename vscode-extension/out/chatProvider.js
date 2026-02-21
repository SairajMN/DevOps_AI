"use strict";
/**
 * DevOps AI - VS Code Chat Provider
 * Cline-like chat sidebar interface
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DevOpsAIChatProvider = void 0;
const vscode = __importStar(require("vscode"));
const axios_1 = __importDefault(require("axios"));
// ============================================================================
// Chat View Provider
// ============================================================================
class DevOpsAIChatProvider {
    constructor(extensionUri) {
        this._messages = [];
        this._extensionUri = extensionUri;
        this._serverUrl = vscode.workspace.getConfiguration('devops-ai').get('serverUrl', 'http://localhost:3000');
    }
    resolveWebviewView(webviewView, context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'sendMessage':
                    await this._handleUserMessage(data.message);
                    break;
                case 'clearChat':
                    this._messages = [];
                    this._updateChat();
                    break;
                case 'runTests':
                    await this._runTests();
                    break;
                case 'buildProject':
                    await this._buildProject();
                    break;
                case 'analyzeLogs':
                    await this._analyzeLogs();
                    break;
                case 'openFile':
                    await this._openFile(data.path);
                    break;
            }
        });
    }
    async _handleUserMessage(message) {
        if (!message.trim()) {
            return;
        }
        // Add user message
        const userMsg = {
            id: Date.now().toString(),
            role: 'user',
            content: message,
            timestamp: new Date()
        };
        this._messages.push(userMsg);
        this._updateChat();
        // Add loading message
        const loadingId = (Date.now() + 1).toString();
        const loadingMsg = {
            id: loadingId,
            role: 'assistant',
            content: 'Thinking...',
            timestamp: new Date(),
            isLoading: true
        };
        this._messages.push(loadingMsg);
        this._updateChat();
        try {
            // Check if it's an action command
            const lowerMessage = message.toLowerCase();
            let response;
            if (lowerMessage.includes('run test') || lowerMessage.includes('run my test')) {
                const result = await this._executeTask('test');
                response = result.success
                    ? `✅ Tests passed!\n\`\`\`\n${result.output}\n\`\`\``
                    : `❌ Tests failed!\n\`\`\`\n${result.error}\n\`\`\``;
            }
            else if (lowerMessage.includes('build')) {
                const result = await this._executeTask('build');
                response = result.success
                    ? `✅ Build successful!\n\`\`\`\n${result.output}\n\`\`\``
                    : `❌ Build failed!\n\`\`\`\n${result.error}\n\`\`\``;
            }
            else if (lowerMessage.includes('install')) {
                const result = await this._executeTask('install');
                response = result.success
                    ? `✅ Dependencies installed!\n\`\`\`\n${result.output}\n\`\`\``
                    : `❌ Installation failed!\n\`\`\`\n${result.error}\n\`\`\``;
            }
            else if (lowerMessage.includes('analyze') || lowerMessage.includes('log')) {
                const result = await this._executeTask('analyze');
                response = result.output || result.error || 'No results';
            }
            else if (lowerMessage.includes('fix') || lowerMessage.includes('debug')) {
                // Get current file content if available
                const editor = vscode.window.activeTextEditor;
                const code = editor?.document.getText() || '';
                const result = await this._fixCode(code, message);
                response = result.output || result.error || 'Could not generate fix';
            }
            else {
                // Regular chat
                response = await this._chat(message);
            }
            // Replace loading message with actual response
            const index = this._messages.findIndex(m => m.id === loadingId);
            if (index !== -1) {
                this._messages[index] = {
                    id: loadingId,
                    role: 'assistant',
                    content: response,
                    timestamp: new Date()
                };
            }
        }
        catch (error) {
            // Replace loading with error
            const index = this._messages.findIndex(m => m.id === loadingId);
            if (index !== -1) {
                this._messages[index] = {
                    id: loadingId,
                    role: 'assistant',
                    content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    timestamp: new Date()
                };
            }
        }
        this._updateChat();
    }
    async _chat(message) {
        try {
            const response = await axios_1.default.post(`${this._serverUrl}/api/analyze`, {
                log: message,
                preferAccomplishAI: true
            });
            const data = response.data;
            if (data.analysis) {
                return `**Error Type:** ${data.analysis.error_type || 'Unknown'}\n\n` +
                    `**Root Cause:** ${data.analysis.root_cause || 'Unknown'}\n\n` +
                    `**Confidence:** ${data.analysis.confidence || 0}%\n\n` +
                    `**Suggested Fix:** ${data.analysis.suggested_fix || 'No suggestion'}\n\n` +
                    (data.analysis.step_by_step_fix?.length
                        ? `**Steps:**\n${data.analysis.step_by_step_fix.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
                        : '');
            }
            return data.response || JSON.stringify(data, null, 2);
        }
        catch (error) {
            throw new Error(`Failed to get AI response. Is the server running at ${this._serverUrl}?`);
        }
    }
    async _executeTask(task) {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return { success: false, error: 'No workspace folder open' };
        }
        const terminal = vscode.window.createTerminal('DevOps AI');
        try {
            let command = '';
            const packageJson = await this._fileExists(vscode.Uri.joinPath(workspaceFolder.uri, 'package.json'));
            const isNode = packageJson;
            switch (task) {
                case 'test':
                    command = isNode ? 'npm test' : 'python -m pytest';
                    break;
                case 'build':
                    command = isNode ? 'npm run build' : 'python setup.py build';
                    break;
                case 'install':
                    command = isNode ? 'npm install' : 'pip install -r requirements.txt';
                    break;
                case 'analyze':
                    return await this._analyzeWorkspaceLogs();
            }
            terminal.sendText(command);
            terminal.show();
            return { success: true, output: `Running: ${command}` };
        }
        catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
    async _analyzeWorkspaceLogs() {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return { success: false, error: 'No workspace folder open' };
        }
        // Find log files
        const logFiles = await vscode.workspace.findFiles('**/*.log', '**/node_modules/**', 10);
        if (logFiles.length === 0) {
            return { success: false, error: 'No log files found in workspace' };
        }
        // Read first log file
        const logContent = await vscode.workspace.fs.readFile(logFiles[0]);
        const logText = Buffer.from(logContent).toString('utf-8');
        try {
            const response = await axios_1.default.post(`${this._serverUrl}/api/analyze`, {
                log: logText,
                preferAccomplishAI: true
            });
            const data = response.data;
            if (data.analysis) {
                return {
                    success: true,
                    output: `**Error Type:** ${data.analysis.error_type}\n\n` +
                        `**Root Cause:** ${data.analysis.root_cause}\n\n` +
                        `**Suggested Fix:** ${data.analysis.suggested_fix}`
                };
            }
            return { success: true, output: JSON.stringify(data, null, 2) };
        }
        catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Analysis failed' };
        }
    }
    async _fixCode(code, errorMessage) {
        try {
            const response = await axios_1.default.post(`${this._serverUrl}/api/fix`, {
                code,
                errorMessage,
                language: vscode.window.activeTextEditor?.document.languageId || 'python'
            });
            const data = response.data;
            if (data.fix) {
                return {
                    success: true,
                    output: `**Fix Description:** ${data.fix.fix_description}\n\n` +
                        `**Explanation:** ${data.fix.explanation}\n\n` +
                        `**Fixed Code:**\n\`\`\`\n${data.fix.fixed_code}\n\`\`\``
                };
            }
            return { success: true, output: JSON.stringify(data, null, 2) };
        }
        catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Fix generation failed' };
        }
    }
    async _runTests() {
        await this._handleUserMessage('run my tests');
    }
    async _buildProject() {
        await this._handleUserMessage('build the project');
    }
    async _analyzeLogs() {
        await this._handleUserMessage('analyze the logs');
    }
    async _openFile(filePath) {
        try {
            const uri = vscode.Uri.file(filePath);
            const doc = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(doc);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to open file: ${filePath}`);
        }
    }
    async _fileExists(uri) {
        try {
            await vscode.workspace.fs.stat(uri);
            return true;
        }
        catch {
            return false;
        }
    }
    _updateChat() {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'updateMessages',
                messages: this._messages
            });
        }
    }
    _getHtmlForWebview(webview) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DevOps AI Chat</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        body {
            font-family: var(--vscode-font-family);
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .header {
            padding: 12px 16px;
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .header h2 {
            font-size: 14px;
            font-weight: 600;
        }
        
        .header-actions {
            margin-left: auto;
            display: flex;
            gap: 4px;
        }
        
        .icon-btn {
            background: none;
            border: none;
            color: var(--vscode-foreground);
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
        }
        
        .icon-btn:hover {
            background: var(--vscode-toolbar-hoverBackground);
        }
        
        .quick-actions {
            padding: 8px 16px;
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }
        
        .quick-btn {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
        }
        
        .quick-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        
        .messages {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
        }
        
        .message {
            margin-bottom: 16px;
            max-width: 100%;
        }
        
        .message.user {
            display: flex;
            justify-content: flex-end;
        }
        
        .message-content {
            padding: 10px 14px;
            border-radius: 12px;
            max-width: 85%;
            word-wrap: break-word;
            white-space: pre-wrap;
        }
        
        .message.user .message-content {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border-bottom-right-radius: 4px;
        }
        
        .message.assistant .message-content {
            background: var(--vscode-editor-inactiveSelectionBackground);
            border-bottom-left-radius: 4px;
        }
        
        .message.assistant.loading .message-content {
            opacity: 0.7;
        }
        
        .message-content code {
            background: var(--vscode-textCodeBlock-background);
            padding: 2px 6px;
            border-radius: 4px;
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
        }
        
        .message-content pre {
            background: var(--vscode-textCodeBlock-background);
            padding: 12px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 8px 0;
        }
        
        .message-content pre code {
            background: none;
            padding: 0;
        }
        
        .input-area {
            padding: 12px 16px;
            border-top: 1px solid var(--vscode-panel-border);
        }
        
        .input-container {
            display: flex;
            gap: 8px;
            align-items: flex-end;
        }
        
        #messageInput {
            flex: 1;
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            color: var(--vscode-input-foreground);
            padding: 10px 14px;
            border-radius: 8px;
            font-family: var(--vscode-font-family);
            font-size: 13px;
            resize: none;
            min-height: 40px;
            max-height: 120px;
        }
        
        #messageInput:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }
        
        #sendBtn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 10px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
        }
        
        #sendBtn:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        #sendBtn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .typing-indicator {
            display: flex;
            gap: 4px;
            padding: 8px;
        }
        
        .typing-dot {
            width: 8px;
            height: 8px;
            background: var(--vscode-foreground);
            border-radius: 50%;
            animation: typing 1.4s infinite ease-in-out;
        }
        
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        
        @keyframes typing {
            0%, 60%, 100% { transform: translateY(0); }
            30% { transform: translateY(-4px); }
        }
    </style>
</head>
<body>
    <div class="header">
        <span>🤖</span>
        <h2>DevOps AI</h2>
        <div class="header-actions">
            <button class="icon-btn" onclick="clearChat()" title="Clear Chat">🗑️</button>
        </div>
    </div>
    
    <div class="quick-actions">
        <button class="quick-btn" onclick="runTests()">▶️ Run Tests</button>
        <button class="quick-btn" onclick="buildProject()">🔨 Build</button>
        <button class="quick-btn" onclick="analyzeLogs()">📊 Analyze Logs</button>
    </div>
    
    <div class="messages" id="messages"></div>
    
    <div class="input-area">
        <div class="input-container">
            <textarea 
                id="messageInput" 
                placeholder="Ask me anything... (e.g., 'run my tests', 'fix this error')"
                rows="1"
            ></textarea>
            <button id="sendBtn" onclick="sendMessage()">Send</button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let messages = [];
        
        const messagesDiv = document.getElementById('messages');
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        
        // Auto-resize textarea
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        });
        
        // Send on Enter (Shift+Enter for new line)
        messageInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        function sendMessage() {
            const message = messageInput.value.trim();
            if (!message) return;
            
            vscode.postMessage({ type: 'sendMessage', message });
            messageInput.value = '';
            messageInput.style.height = 'auto';
        }
        
        function clearChat() {
            vscode.postMessage({ type: 'clearChat' });
        }
        
        function runTests() {
            vscode.postMessage({ type: 'runTests' });
        }
        
        function buildProject() {
            vscode.postMessage({ type: 'buildProject' });
        }
        
        function analyzeLogs() {
            vscode.postMessage({ type: 'analyzeLogs' });
        }
        
        function renderMessages() {
            messagesDiv.innerHTML = messages.map(msg => {
                const className = msg.role + (msg.isLoading ? ' loading' : '');
                const content = msg.isLoading 
                    ? '<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>'
                    : formatContent(msg.content);
                return '<div class="message ' + className + '"><div class="message-content">' + content + '</div></div>';
            }).join('');
            
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
        
        function formatContent(content) {
            // Simple markdown-like formatting
            return content
                .replace(/\`\`\`(\\w*)\n([\\s\\S]*?)\`\`\`/g, '<pre><code>$2</code></pre>')
                .replace(/\`([^\`]+)\`/g, '<code>$1</code>')
                .replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>')
                .replace(/\\n/g, '<br>');
        }
        
        // Handle messages from extension
        window.addEventListener('message', event => {
            const data = event.data;
            if (data.type === 'updateMessages') {
                messages = data.messages;
                renderMessages();
            }
        });
        
        // Initial render
        renderMessages();
    </script>
</body>
</html>`;
    }
}
exports.DevOpsAIChatProvider = DevOpsAIChatProvider;
DevOpsAIChatProvider.viewType = 'devopsAi.chatView';
//# sourceMappingURL=chatProvider.js.map