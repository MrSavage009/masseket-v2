"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const cp = require("child_process");
const path = require("path");
let diagnosticCollection;
let statusBarItem;
function activate(context) {
    diagnosticCollection = vscode.languages.createDiagnosticCollection('masseket');
    context.subscriptions.push(diagnosticCollection);
    // Status bar sparkle indicator
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "$(sparkle) Masseket";
    statusBarItem.tooltip = "Masseket v2: Tensor Loop Compiler Active\nClick to open full Loom panel";
    statusBarItem.command = 'masseket.visualize';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
    // Hover provider — COMPACT (no scrolling)
    const hoverProvider = vscode.languages.registerHoverProvider('python', {
        provideHover(document, position, token) {
            const text = document.getText();
            const regex = /for\s+\w+\s+in\s+range\([^)]+\):[\s\S]*?output\[[^\]]+\]\s*=\s*input_tensor\[[^\]]+\]/g;
            let match;
            while ((match = regex.exec(text)) !== null) {
                const startPos = document.positionAt(match.index);
                const endPos = document.positionAt(match.index + match[0].length);
                const range = new vscode.Range(startPos, endPos);
                if (range.contains(position)) {
                    const code = match[0];
                    return runPythonBackend(code).then(res => {
                        if (res.status === 'success') {
                            const verifiedMark = res.verified ? '✓ **Verified**' : '⚠️ **Unverified**';
                            const speedup = res.speedup_estimate ? `🚀 ${res.speedup_estimate}` : '';
                            const md = new vscode.MarkdownString(`### 🧶 Masseket v2  \n${verifiedMark} | ${speedup}\n\n<img src="data:image/svg+xml;utf8,${encodeURIComponent(res.svg)}" width="320" />`);
                            md.supportHtml = true;
                            return new vscode.Hover(md, range);
                        }
                        return undefined;
                    }).catch(() => undefined);
                }
            }
            return undefined;
        }
    });
    // Code action (lightbulb)
    const codeActionProvider = vscode.languages.registerCodeActionsProvider('python', {
        provideCodeActions(document, range, context, token) {
            const text = document.getText();
            const regex = /for\s+\w+\s+in\s+range\([^)]+\):[\s\S]*?output\[[^\]]+\]\s*=\s*input_tensor\[[^\]]+\]/g;
            let match;
            while ((match = regex.exec(text)) !== null) {
                const startPos = document.positionAt(match.index);
                const endPos = document.positionAt(match.index + match[0].length);
                const loopRange = new vscode.Range(startPos, endPos);
                if (loopRange.intersection(range) || loopRange.contains(range.start)) {
                    const code = match[0];
                    return runPythonBackend(code).then(res => {
                        if (res.status === 'success') {
                            const action = new vscode.CodeAction('🧶 Replace loop with vectorized einops', vscode.CodeActionKind.Refactor);
                            action.edit = new vscode.WorkspaceEdit();
                            action.edit.replace(document.uri, loopRange, res.code);
                            return [action];
                        }
                        return [];
                    }).catch(() => []);
                }
            }
            return [];
        }
    });
    // FULL PANEL COMMAND — no scrolling, gorgeous layout
    const openPanelCommand = vscode.commands.registerCommand('masseket.visualize', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'python') {
            vscode.window.showWarningMessage('Masseket: Open a Python file and place cursor inside a tensor loop.');
            return;
        }
        const text = editor.document.getText();
        const regex = /for\s+\w+\s+in\s+range\([^)]+\):[\s\S]*?output\[[^\]]+\]\s*=\s*input_tensor\[[^\]]+\]/g;
        let match;
        let foundCode = '';
        while ((match = regex.exec(text)) !== null) {
            const startPos = editor.document.positionAt(match.index);
            const endPos = editor.document.positionAt(match.index + match[0].length);
            const range = new vscode.Range(startPos, endPos);
            if (range.contains(editor.selection.active)) {
                foundCode = match[0];
                break;
            }
        }
        if (!foundCode) {
            vscode.window.showWarningMessage('Masseket: Place cursor inside a tensor loop first.');
            return;
        }
        try {
            const res = await runPythonBackend(foundCode);
            if (res.status !== 'success') {
                vscode.window.showErrorMessage('Masseket: ' + (res.message || 'Failed to parse loop'));
                return;
            }
            const panel = vscode.window.createWebviewPanel('masseketLoom', '🧶 Masseket Tensor Loom', vscode.ViewColumn.Two, { enableScripts: false, retainContextWhenHidden: true });
            const verifiedBadge = res.verified
                ? '<span style="color:#33FF57;font-weight:bold;">✓ VERIFIED</span>'
                : '<span style="color:#FF5733;font-weight:bold;">⚠️ UNVERIFIED</span>';
            panel.webview.html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { 
                            background: #1a1b26; 
                            color: #c0caf5; 
                            font-family: system-ui, -apple-system, sans-serif;
                            display: flex; 
                            flex-direction: column;
                            justify-content: center; 
                            align-items: center; 
                            min-height: 100vh; 
                            margin: 0; 
                            padding: 20px;
                            box-sizing: border-box;
                        }
                        .header { text-align: center; margin-bottom: 20px; }
                        .header h1 { margin: 0 0 10px 0; font-size: 18px; color: #a9b1d6; }
                        .badge { font-size: 14px; margin-bottom: 8px; }
                        .meta { color: #FFAF33; font-size: 13px; margin-bottom: 6px; }
                        .svg-box {
                            background: #16161e;
                            border-radius: 8px;
                            padding: 16px;
                            box-shadow: 0 4px 20px rgba(0,0,0,0.4);
                        }
                        .code-box {
                            background: #24283b;
                            padding: 12px 16px;
                            border-radius: 6px;
                            font-family: 'Courier New', monospace;
                            font-size: 13px;
                            color: #7aa2f7;
                            margin-top: 20px;
                            max-width: 90%;
                            overflow-x: auto;
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="badge">${verifiedBadge}</div>
                        <h1>Tensor Thread Flow</h1>
                        ${res.speedup_estimate ? `<div class="meta">🚀 ${res.speedup_estimate}</div>` : ''}
                    </div>
                    <div class="svg-box">${res.svg}</div>
                    <div class="code-box">${res.code || ''}</div>
                </body>
                </html>
            `;
        }
        catch (err) {
            vscode.window.showErrorMessage('Masseket Error: ' + err.message);
        }
    });
    // Diagnostics on save
    const diagnosticUpdater = vscode.workspace.onDidSaveTextDocument(async (doc) => {
        if (doc.languageId !== 'python')
            return;
        const text = doc.getText();
        const loopMatches = text.matchAll(/for\s+\w+\s+in\s+range\([^)]+\):[\s\S]*?output\[[^\]]+\]\s*=\s*input_tensor\[[^\]]+\]/g);
        const diagnostics = [];
        for (const match of loopMatches) {
            const startPos = doc.positionAt(match.index);
            const endPos = doc.positionAt(match.index + match[0].length);
            const range = new vscode.Range(startPos, endPos);
            try {
                const res = await runPythonBackend(match[0]);
                if (res.status === 'success' && !res.verified) {
                    diagnostics.push(new vscode.Diagnostic(range, 'Masseket: Unverified loop transformation – shape mismatch.', vscode.DiagnosticSeverity.Warning));
                }
                else if (res.status === 'error') {
                    diagnostics.push(new vscode.Diagnostic(range, `Masseket: ${res.message}`, vscode.DiagnosticSeverity.Error));
                }
            }
            catch (e) { /* silent */ }
        }
        diagnosticCollection.set(doc.uri, diagnostics);
    });
    context.subscriptions.push(hoverProvider, codeActionProvider, openPanelCommand, diagnosticUpdater);
}
async function runPythonBackend(code) {
    const pythonPath = vscode.workspace.getConfiguration('masseket').get('pythonPath', 'python3');
    const scriptPath = path.join(__dirname, '..', 'python_backend', 'masseket_v2.py');
    return new Promise((resolve, reject) => {
        const proc = cp.spawn(pythonPath, [scriptPath, code]);
        let stdout = '', stderr = '';
        proc.stdout.on('data', d => stdout += d);
        proc.stderr.on('data', d => stderr += d);
        proc.on('close', code => {
            if (code !== 0)
                reject(new Error(stderr || 'Backend crashed'));
            else {
                try {
                    resolve(JSON.parse(stdout));
                }
                catch (e) {
                    reject(new Error('Backend returned invalid JSON'));
                }
            }
        });
    });
}
function deactivate() {
    if (statusBarItem)
        statusBarItem.dispose();
}
//# sourceMappingURL=extension.js.map