import JSZip from "jszip";
import type { ArchiveFile } from "./archive";
import type { AppConfig } from "./android";

function strToAb(s: string): ArrayBuffer {
  return new TextEncoder().encode(s).buffer as ArrayBuffer;
}

/* ── GitHub Actions: Windows (.exe) + Mac (.dmg) + Linux (.AppImage) ── */
export function genDesktopWorkflow(c: AppConfig): string {
  const safe = c.appName.replace(/[^a-zA-Z0-9]/g, "-");
  return `name: Build Desktop Apps

on:
  push:
    branches: [main, master]
  workflow_dispatch:

jobs:
  build:
    strategy:
      matrix:
        include:
          - os: ubuntu-latest
            label: linux
            ext: AppImage
          - os: windows-latest
            label: windows
            ext: exe
          - os: macos-latest
            label: mac
            ext: dmg
    runs-on: \${{ matrix.os }}
    timeout-minutes: 30
    permissions:
      contents: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Build desktop app
        run: npm run build
        env:
          GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}

      - name: Localizar instalador gerado
        id: find
        shell: bash
        run: |
          FILE=\$(find dist -name "*.\${{ matrix.ext }}" | head -1)
          echo "file=\$FILE" >> \$GITHUB_OUTPUT
          echo "Instalador: \$FILE"

      - name: Deletar release anterior (se existir)
        if: steps.find.outputs.file != ''
        shell: bash
        run: |
          gh release delete latest-\${{ matrix.label }} --yes 2>/dev/null || true
          git push origin --delete latest-\${{ matrix.label }} 2>/dev/null || true
        env:
          GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}

      - name: Publicar como Release público
        if: steps.find.outputs.file != ''
        shell: bash
        run: |
          gh release create latest-\${{ matrix.label }} \\
            --title "✅ ${safe} — \${{ matrix.label }} (mais recente)" \\
            --notes "Instalador gerado automaticamente. Clique no arquivo abaixo para baixar." \\
            --latest \\
            "\${{ steps.find.outputs.file }}"
        env:
          GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}
`;
}

/* ── package.json do projeto Electron ── */
function genElectronPackageJson(c: AppConfig): string {
  const safe = c.appName.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
  return JSON.stringify({
    name: safe,
    version: c.versionName,
    description: `${c.appName} — App desktop`,
    main: "main.js",
    scripts: {
      start: "electron .",
      build: "electron-builder",
      "build:win": "electron-builder --win",
      "build:mac": "electron-builder --mac",
      "build:linux": "electron-builder --linux",
    },
    build: {
      appId: c.appId,
      productName: c.appName,
      directories: { output: "dist" },
      files: ["main.js", "preload.js", "www/**/*", "icon.*"],
      win: {
        target: [{ target: "nsis", arch: ["x64"] }],
        icon: "icon.ico",
      },
      mac: {
        target: [{ target: "dmg", arch: ["x64", "arm64"] }],
        icon: "icon.icns",
        category: "public.app-category.utilities",
      },
      linux: {
        target: [{ target: "AppImage", arch: ["x64"] }],
        icon: "icon.png",
        category: "Utility",
      },
      nsis: {
        oneClick: false,
        allowToChangeInstallationDirectory: true,
        installerIcon: "icon.ico",
        uninstallerIcon: "icon.ico",
        installerHeaderIcon: "icon.ico",
        createDesktopShortcut: true,
        createStartMenuShortcut: true,
        shortcutName: c.appName,
      },
    },
    devDependencies: {
      electron: "^31.0.0",
      "electron-builder": "^24.13.3",
    },
  }, null, 2);
}

/* ── main.js do Electron ── */
function genElectronMain(c: AppConfig): string {
  const w = c.orientation === "landscape" ? 1280 : 960;
  const h = c.orientation === "landscape" ? 800 : 700;
  return `const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

let win;

function createWindow() {
  win = new BrowserWindow({
    width: ${w},
    height: ${h},
    minWidth: 400,
    minHeight: 300,
    title: '${c.appName.replace(/'/g, "\\'")}',
    backgroundColor: '${c.bgColor}',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
    show: false,
    autoHideMenuBar: true,
  });

  win.loadFile(path.join(__dirname, 'www', 'index.html'));

  win.once('ready-to-show', () => win.show());

  // Remove menu bar
  Menu.setApplicationMenu(null);
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
`;
}

/* ── preload.js do Electron ── */
function genElectronPreload(): string {
  return `const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  version: process.versions.electron,
});
`;
}

/* ── README.md ── */
function genDesktopReadme(c: AppConfig): string {
  return `# ${c.appName} — App Desktop

Aplicativo gerado pelo APK Builder para Windows, Mac e Linux.

## Como compilar

### Usando GitHub Actions (automático)
1. Suba este repositório no GitHub
2. O workflow \`.github/workflows/build-desktop.yml\` compila automaticamente
3. Baixe os executáveis na aba **Actions → Artifacts**

### Manualmente
\`\`\`bash
npm install
npm run build
\`\`\`

Os arquivos estarão em \`dist/\`:
- **Windows**: \`${c.appName.replace(/[^a-zA-Z0-9]/g, "-")}-Setup-${c.versionName}.exe\`
- **Mac**: \`${c.appName.replace(/[^a-zA-Z0-9]/g, "-")}-${c.versionName}.dmg\`
- **Linux**: \`${c.appName.replace(/[^a-zA-Z0-9]/g, "-")}-${c.versionName}.AppImage\`

## Requisitos
- Node.js 18+
- npm

## Gerado por
[APK Builder](https://replit.com) — Maikon Caldeira
`;
}

/* ── Constrói lista de arquivos para push no GitHub ── */
export async function buildDesktopFilesForGithub(
  cfg: AppConfig,
  webFiles: ArchiveFile[],
): Promise<ArchiveFile[]> {
  const result: ArchiveFile[] = [];

  result.push({ path: "package.json",   content: strToAb(genElectronPackageJson(cfg)) });
  result.push({ path: "main.js",        content: strToAb(genElectronMain(cfg)) });
  result.push({ path: "preload.js",     content: strToAb(genElectronPreload()) });
  result.push({ path: "README.md",      content: strToAb(genDesktopReadme(cfg)) });
  result.push({ path: ".github/workflows/build-desktop.yml", content: strToAb(genDesktopWorkflow(cfg)) });
  result.push({ path: ".gitignore",     content: strToAb("node_modules/\ndist/\n") });

  // Copia arquivos web para www/
  for (const f of webFiles) {
    result.push({ path: `www/${f.path}`, content: f.content });
  }

  return result;
}

/* ── Gera ZIP para download local ── */
export async function buildDesktopZip(
  cfg: AppConfig,
  webFiles: ArchiveFile[],
): Promise<Blob> {
  const zip = new JSZip();

  zip.file("package.json",  genElectronPackageJson(cfg));
  zip.file("main.js",       genElectronMain(cfg));
  zip.file("preload.js",    genElectronPreload());
  zip.file("README.md",     genDesktopReadme(cfg));
  zip.file(".github/workflows/build-desktop.yml", genDesktopWorkflow(cfg));
  zip.file(".gitignore",    "node_modules/\ndist/\n");

  const wwwFolder = zip.folder("www")!;
  for (const f of webFiles) {
    const parts = f.path.split("/");
    let cur = wwwFolder;
    for (let i = 0; i < parts.length - 1; i++) {
      cur = cur.folder(parts[i])!;
    }
    cur.file(parts[parts.length - 1], f.content);
  }

  return zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
}
