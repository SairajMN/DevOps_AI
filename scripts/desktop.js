/**
 * DevOps AI Desktop Application
 * Electron wrapper for the web application
 */

const { app, BrowserWindow, Tray, Menu, nativeImage, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow = null;
let tray = null;
let serverProcess = null;
const PORT = process.env.PORT || 3000;

// Check if we're in development or production
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        title: 'DevOps AI - Task Manager & AI Assistant',
        icon: path.join(__dirname, 'icon.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true
        },
        backgroundColor: '#020617',
        show: false,
        autoHideMenuBar: true
    });

    // Load the app
    mainWindow.loadURL(`http://localhost:${PORT}/app`);

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Handle external links
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http')) {
            shell.openExternal(url);
        }
        return { action: 'deny' };
    });

    // Minimize to tray instead of closing
    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function createTray() {
    // Create a simple icon (you can replace with actual icon)
    const icon = nativeImage.createFromDataURL(
        'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM2MzY2ZjEiIHN0cm9rZS13aWR0aD0iMiI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiLz48cGF0aCBkPSJNOCAxMmg4Ii8+PHBhdGggZD0iTTEyIDh2OCIvPjwvc3ZnPg=='
    );
    
    tray = new Tray(icon.resize({ width: 16, height: 16 }));
    
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Open DevOps AI', click: () => mainWindow?.show() },
        { type: 'separator' },
        { label: 'Open in Browser', click: () => shell.openExternal(`http://localhost:${PORT}/app`) },
        { type: 'separator' },
        { label: 'Quit', click: () => {
            app.isQuitting = true;
            app.quit();
        }}
    ]);
    
    tray.setToolTip('DevOps AI');
    tray.setContextMenu(contextMenu);
    
    tray.on('double-click', () => {
        mainWindow?.show();
    });
}

function startServer() {
    return new Promise((resolve, reject) => {
        console.log('Starting DevOps AI server...');
        
        // Start the Node.js server
        const serverPath = isDev 
            ? path.join(__dirname, '..', 'node_modules', '.bin', 'ts-node')
            : path.join(__dirname, '..', 'dist', 'index.js');
        
        if (isDev) {
            serverProcess = spawn('npx', ['ts-node', path.join(__dirname, '..', 'src', 'index.ts')], {
                cwd: path.join(__dirname, '..'),
                env: { ...process.env, PORT: PORT.toString() },
                shell: true
            });
        } else {
            serverProcess = spawn('node', [serverPath], {
                cwd: path.join(__dirname, '..'),
                env: { ...process.env, PORT: PORT.toString() }
            });
        }

        serverProcess.stdout?.on('data', (data) => {
            console.log(`Server: ${data}`);
            if (data.toString().includes('Server running')) {
                resolve();
            }
        });

        serverProcess.stderr?.on('data', (data) => {
            console.error(`Server Error: ${data}`);
        });

        serverProcess.on('error', (err) => {
            console.error('Failed to start server:', err);
            reject(err);
        });

        // Timeout after 10 seconds
        setTimeout(resolve, 10000);
    });
}

function stopServer() {
    if (serverProcess) {
        console.log('Stopping server...');
        serverProcess.kill();
        serverProcess = null;
    }
}

// App lifecycle
app.whenReady().then(async () => {
    try {
        await startServer();
        createWindow();
        createTray();
    } catch (error) {
        console.error('Failed to start:', error);
        app.quit();
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('before-quit', () => {
    app.isQuitting = true;
    stopServer();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});