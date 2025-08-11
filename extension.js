const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

let statusBarItem;

function loadExcludesConfig() {
  try {
    const excludesPath = path.join(__dirname, 'excludes.json');
    const configData = fs.readFileSync(excludesPath, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    console.error('Error loading excludes config:', error);
    return {
      defaultExcludes: {
        folders: ['.git', '.vscode', 'node_modules'],
        hiddenFolders: ['.*'],
        files: ['.gitignore', '.vscodeignore', '*.log'],
        extensions: ['*.exe', '*.vsix', '*.zip'],
        binaryExtensions: ['*.jpg', '*.png', '*.pdf']
      },
      textFileExtensions: ['.js', '.ts', '.html', '.css', '.json', '.md', '.txt', '.py']
    };
  }
}

function createIgnoreDirectory() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    return null;
  }

  const copyAllFilesDir = path.join(workspaceFolders[0].uri.fsPath, '.vscode', 'copy-all-files');

  if (!fs.existsSync(copyAllFilesDir)) {
    fs.mkdirSync(copyAllFilesDir, { recursive: true });
  }

  const ignoreFilePath = path.join(copyAllFilesDir, 'ignore.txt');
  if (!fs.existsSync(ignoreFilePath)) {
    const defaultIgnoreContent = `# Add relative paths to ignore, one per line
# Examples:
# prueba\\test.py
# src\\temp
# docs\\draft.md
# *.backup
# temp-folder
`;
    fs.writeFileSync(ignoreFilePath, defaultIgnoreContent);
  }

  return copyAllFilesDir;
}

function getIgnorePatterns() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    return [];
  }

  const ignoreFilePath = path.join(workspaceFolders[0].uri.fsPath, '.vscode', 'copy-all-files', 'ignore.txt');

  if (!fs.existsSync(ignoreFilePath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(ignoreFilePath, 'utf8');
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
  } catch (error) {
    console.error('Error reading ignore file:', error);
    return [];
  }
}

function shouldIgnoreFile(relativePath, ignorePatterns, excludesConfig) {
  const normalizedPath = relativePath.replace(/\//g, path.sep);
  const fileName = path.basename(normalizedPath);
  const fileExtension = path.extname(normalizedPath).toLowerCase();
  const pathParts = normalizedPath.split(path.sep);

  if (pathParts.includes('.vscode')) {
    return true;
  }

  for (const part of pathParts) {
    if (part.startsWith('.') && part !== '.' && part !== '..') {
      return true;
    }
  }

  for (const folder of excludesConfig.defaultExcludes.folders) {
    if (pathParts.includes(folder)) {
      return true;
    }
  }

  for (const pattern of excludesConfig.defaultExcludes.files) {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$', 'i');
      if (regex.test(fileName)) {
        return true;
      }
    } else if (fileName.toLowerCase() === pattern.toLowerCase()) {
      return true;
    }
  }

  for (const pattern of excludesConfig.defaultExcludes.extensions) {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$', 'i');
      if (regex.test(fileName)) {
        return true;
      }
    }
  }

  for (const pattern of excludesConfig.defaultExcludes.binaryExtensions) {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$', 'i');
      if (regex.test(fileName)) {
        return true;
      }
    }
  }

  for (const pattern of ignorePatterns) {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$', 'i');
      if (regex.test(normalizedPath) || regex.test(fileName)) {
        return true;
      }
    } else {
      if (normalizedPath === pattern || normalizedPath.endsWith(path.sep + pattern)) {
        return true;
      }
    }
  }

  return false;
}

function isTextFile(filePath, excludesConfig) {
  const fileExtension = path.extname(filePath).toLowerCase();

  if (!fileExtension) {
    try {
      const buffer = fs.readFileSync(filePath);
      const sample = buffer.slice(0, Math.min(1024, buffer.length));
      for (let i = 0; i < sample.length; i++) {
        const byte = sample[i];
        if (byte === 0 || (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13)) {
          return false;
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  return excludesConfig.textFileExtensions.includes(fileExtension);
}

function getAllFiles(dirPath, basePath, ignorePatterns = [], excludesConfig) {
  let results = [];

  try {
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      const relativePath = path.relative(basePath, fullPath).replace(/\\/g, '/');

      if (shouldIgnoreFile(relativePath, ignorePatterns, excludesConfig)) {
        continue;
      }

      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        results = results.concat(getAllFiles(fullPath, basePath, ignorePatterns, excludesConfig));
      } else if (stat.isFile() && isTextFile(fullPath, excludesConfig)) {
        results.push({
          path: fullPath,
          relativePath: relativePath
        });
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
  }

  return results;
}

async function copyAllFiles() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage('No hay workspace abierto');
    return;
  }

  const workspacePath = workspaceFolders[0].uri.fsPath;
  const ignorePatterns = getIgnorePatterns();
  const excludesConfig = loadExcludesConfig();

  try {
    const files = getAllFiles(workspacePath, workspacePath, ignorePatterns, excludesConfig);

    if (files.length === 0) {
      vscode.window.showWarningMessage('No se encontraron archivos para copiar');
      return;
    }

    let content = '';

    for (const file of files) {
      try {
        const fileContent = fs.readFileSync(file.path, 'utf8');
        content += `# ${file.relativePath}\n\n${fileContent}\n\n---\n\n`;
      } catch (error) {
        console.error(`Error reading file ${file.path}:`, error);
      }
    }

    content = content.replace(/---\n\n$/, '');

    await vscode.env.clipboard.writeText(content);
    vscode.window.showInformationMessage('Copiado');

  } catch (error) {
    console.error('Error copying files:', error);
    vscode.window.showErrorMessage('Error al copiar archivos');
  }
}

function createStatusBarItem() {
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = '$(copy)';
  statusBarItem.tooltip = 'Copy All Files to Clipboard';
  statusBarItem.command = 'copy-all-files.copyFiles';
  statusBarItem.show();
}

function setupFileWatcher(context) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    return;
  }

  const copyAllFilesDir = path.join(workspaceFolders[0].uri.fsPath, '.vscode', 'copy-all-files');

  if (!fs.existsSync(copyAllFilesDir)) {
    return;
  }

  const ignoreFilePattern = new vscode.RelativePattern(copyAllFilesDir, 'ignore.txt');
  const watcher = vscode.workspace.createFileSystemWatcher(ignoreFilePattern);

  watcher.onDidChange(() => {
  });

  watcher.onDidCreate(() => {
  });

  watcher.onDidDelete(() => {
    createIgnoreDirectory();
  });

  context.subscriptions.push(watcher);
}

function activate(context) {
  createIgnoreDirectory();
  createStatusBarItem();
  setupFileWatcher(context);

  const disposable = vscode.commands.registerCommand('copy-all-files.copyFiles', copyAllFiles);

  context.subscriptions.push(disposable);
  context.subscriptions.push(statusBarItem);
}

function deactivate() {
  if (statusBarItem) {
    statusBarItem.dispose();
  }
}

module.exports = {
  activate,
  deactivate
};
