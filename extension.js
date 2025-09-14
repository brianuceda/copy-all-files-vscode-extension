const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

let contentStatusBarItem;
let treeStatusBarItem;

function loadExcludesConfig() {
  try {
    const excludesPath = path.join(__dirname, "excludes.json");
    const configData = fs.readFileSync(excludesPath, "utf8");
    return JSON.parse(configData);
  } catch (error) {
    console.error("Error loading excludes config:", error);
    return {
      defaultExcludes: {
        folders: [".git", ".vscode", "node_modules"],
        hiddenFolders: [".*"],
        files: [".gitignore", ".vscodeignore", "*.log"],
        extensions: ["*.exe", "*.vsix", "*.zip"],
        binaryExtensions: ["*.jpg", "*.png", "*.pdf"],
      },
      textFileExtensions: [
        ".js",
        ".ts",
        ".html",
        ".css",
        ".json",
        ".md",
        ".txt",
        ".py",
      ],
    };
  }
}

function createIgnoreDirectory() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    return null;
  }

  const copyAllFilesDir = path.join(
    workspaceFolders[0].uri.fsPath,
    ".vscode",
    "copy-all-files"
  );

  if (!fs.existsSync(copyAllFilesDir)) {
    fs.mkdirSync(copyAllFilesDir, { recursive: true });
  }

  const ignoreFilePath = path.join(copyAllFilesDir, "ignore.txt");
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

  const ignoreFilePath = path.join(
    workspaceFolders[0].uri.fsPath,
    ".vscode",
    "copy-all-files",
    "ignore.txt"
  );

  if (!fs.existsSync(ignoreFilePath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(ignoreFilePath, "utf8");
    return content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));
  } catch (error) {
    console.error("Error reading ignore file:", error);
    return [];
  }
}

function shouldIgnoreFile(
  relativePath,
  ignorePatterns,
  excludesConfig,
  checkBinaries = true
) {
  const normalizedPath = relativePath.replace(/\//g, path.sep);
  const fileName = path.basename(normalizedPath);
  const pathParts = normalizedPath.split(path.sep);

  if (pathParts.includes(".vscode")) {
    return true;
  }

  for (const part of pathParts) {
    if (part.startsWith(".") && part !== "." && part !== "..") {
      return true;
    }
  }

  for (const folder of excludesConfig.defaultExcludes.folders) {
    if (pathParts.includes(folder)) {
      return true;
    }
  }

  for (const pattern of excludesConfig.defaultExcludes.files) {
    if (pattern.includes("*")) {
      const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$", "i");
      if (regex.test(fileName)) {
        return true;
      }
    } else if (fileName.toLowerCase() === pattern.toLowerCase()) {
      return true;
    }
  }

  // Lógica condicional: solo se ejecuta si checkBinaries es true
  if (checkBinaries) {
    const binaryLikeExtensions = [
      ...excludesConfig.defaultExcludes.extensions,
      ...excludesConfig.defaultExcludes.binaryExtensions,
    ];
    for (const pattern of binaryLikeExtensions) {
      if (pattern.startsWith("*.")) {
        const ext = pattern.substring(1);
        if (fileName.toLowerCase().endsWith(ext)) {
          return true;
        }
      }
    }
  }

  for (const pattern of ignorePatterns) {
    if (pattern.includes("*")) {
      const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$", "i");
      if (regex.test(normalizedPath) || regex.test(fileName)) {
        return true;
      }
    } else {
      if (
        normalizedPath === pattern ||
        normalizedPath.endsWith(path.sep + pattern)
      ) {
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
        if (
          byte === 0 ||
          (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13)
        ) {
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
      const relativePath = path
        .relative(basePath, fullPath)
        .replace(/\\/g, "/");

      if (
        shouldIgnoreFile(relativePath, ignorePatterns, excludesConfig, false)
      ) {
        continue;
      }

      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        results = results.concat(
          getAllFiles(fullPath, basePath, ignorePatterns, excludesConfig)
        );
      } else if (stat.isFile()) {
        if (
          !shouldIgnoreFile(
            relativePath,
            ignorePatterns,
            excludesConfig,
            true
          ) &&
          isTextFile(fullPath, excludesConfig)
        ) {
          results.push({
            path: fullPath,
            relativePath: relativePath,
          });
        }
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
    vscode.window.showErrorMessage("No hay workspace abierto");
    return;
  }

  const workspacePath = workspaceFolders[0].uri.fsPath;
  const ignorePatterns = getIgnorePatterns();
  const excludesConfig = loadExcludesConfig();

  try {
    const files = getAllFiles(
      workspacePath,
      workspacePath,
      ignorePatterns,
      excludesConfig
    );
    if (files.length === 0) {
      vscode.window.showWarningMessage(
        "No se encontraron archivos de texto para copiar"
      );
      return;
    }

    let content = "";
    for (const file of files) {
      try {
        const fileContent = fs.readFileSync(file.path, "utf8");
        content += `# ${file.relativePath}\n\n${fileContent}\n\n---\n\n`;
      } catch (error) {
        console.error(`Error reading file ${file.path}:`, error);
      }
    }

    content = content.replace(/---\n\n$/, "");
    await vscode.env.clipboard.writeText(content);
    vscode.window.showInformationMessage(
      `Copiado el contenido de ${files.length} archivos`
    );
  } catch (error) {
    console.error("Error copying files:", error);
    vscode.window.showErrorMessage(
      "Error al copiar el contenido de los archivos"
    );
  }
}

function getProjectTreeRecursive(
  dirPath,
  basePath,
  ignorePatterns,
  excludesConfig,
  prefix = ""
) {
  let tree = "";
  const files = fs.readdirSync(dirPath);
  const filteredFiles = files.filter((file) => {
    const fullPath = path.join(dirPath, file);
    const relativePath = path.relative(basePath, fullPath).replace(/\\/g, "/");
    return !shouldIgnoreFile(
      relativePath,
      ignorePatterns,
      excludesConfig,
      false
    );
  });

  filteredFiles.forEach((file, index) => {
    const isLast = index === filteredFiles.length - 1;
    const connector = isLast ? "└── " : "├── ";
    tree += `${prefix}${connector}${file}\n`;

    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      const newPrefix = prefix + (isLast ? "    " : "│   ");
      tree += getProjectTreeRecursive(
        fullPath,
        basePath,
        ignorePatterns,
        excludesConfig,
        newPrefix
      );
    }
  });
  return tree;
}

async function copyProjectTree() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage("No workspace folder is open.");
    return;
  }

  const workspacePath = workspaceFolders[0].uri.fsPath;
  const ignorePatterns = getIgnorePatterns();
  const excludesConfig = loadExcludesConfig();

  try {
    const projectName = path.basename(workspacePath);
    let treeContent = `${projectName}/\n`;
    treeContent += getProjectTreeRecursive(
      workspacePath,
      workspacePath,
      ignorePatterns,
      excludesConfig
    );

    await vscode.env.clipboard.writeText(treeContent);
    vscode.window.showInformationMessage(
      "Project structure (tree) copied to clipboard!"
    );
  } catch (error) {
    console.error("Error copying project tree:", error);
    vscode.window.showErrorMessage(
      "An error occurred while copying the project tree."
    );
  }
}

function createStatusBarItems() {
  contentStatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    101
  );
  contentStatusBarItem.text = "$(copy)";
  contentStatusBarItem.tooltip = "Copy All Files Content to Clipboard";
  contentStatusBarItem.command = "copy-all-files.copyFiles";
  contentStatusBarItem.show();

  treeStatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  treeStatusBarItem.text = "$(list-tree)";
  treeStatusBarItem.tooltip = "Copy Project Structure (Tree) to Clipboard";
  treeStatusBarItem.command = "copy-all-files.copyTree";
  treeStatusBarItem.show();
}

function setupFileWatcher(context) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    return;
  }

  const copyAllFilesDir = path.join(
    workspaceFolders[0].uri.fsPath,
    ".vscode",
    "copy-all-files"
  );

  if (!fs.existsSync(copyAllFilesDir)) {
    return;
  }

  const ignoreFilePattern = new vscode.RelativePattern(
    copyAllFilesDir,
    "ignore.txt"
  );
  const watcher = vscode.workspace.createFileSystemWatcher(ignoreFilePattern);

  watcher.onDidChange(() => {});
  watcher.onDidCreate(() => {});
  watcher.onDidDelete(() => {
    createIgnoreDirectory();
  });

  context.subscriptions.push(watcher);
}

function activate(context) {
  createIgnoreDirectory();
  createStatusBarItems();
  setupFileWatcher(context);

  const copyContentDisposable = vscode.commands.registerCommand(
    "copy-all-files.copyFiles",
    copyAllFiles
  );
  const copyTreeDisposable = vscode.commands.registerCommand(
    "copy-all-files.copyTree",
    copyProjectTree
  );

  context.subscriptions.push(
    copyContentDisposable,
    copyTreeDisposable,
    contentStatusBarItem,
    treeStatusBarItem
  );
}

function deactivate() {
  if (contentStatusBarItem) {
    contentStatusBarItem.dispose();
  }
  if (treeStatusBarItem) {
    treeStatusBarItem.dispose();
  }
}

module.exports = {
  activate,
  deactivate,
};
