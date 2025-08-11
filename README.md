# Copy All Files by Brian Uceda

This extension allows you to copy all files from your workspace to the clipboard in a formatted way, perfect for sharing your project structure and content.

## Features

- Copy all files from your workspace to clipboard with a single click
- Custom format with relative paths and content separators
- Exclude files using `.vscode/copy-all-files/ignore.txt`
- Status bar button for easy access
- Automatic exclusion of common files (`.git`, `node_modules`, etc.)

## How to Use

1. Click the copy icon (📋) in the status bar (bottom right corner)
2. All files will be copied to clipboard in the following format:

```
# relative/path/to/file1.js

file1 content here

---

# relative/path/to/file2.py

file2 content here

---

# relative/path/to/file3.html

file3 content here
```

## 📁 Ignore Files Configuration

The extension automatically creates a `.vscode/copy-all-files/ignore.txt` file where you can specify files and folders to exclude from copying.

### Ignore File Format

Add relative paths, one per line:

```
# Comments start with #
prueba\test.py
node_modules
dist
build
*.log
.env
```

## � Default Exclusions

The extension automatically excludes these common files and folders:
- `.vscode`
- `.git`
- `node_modules`
- `.DS_Store`
- `Thumbs.db`
- `*.log`

## Commands

- `Copy All Files to Clipboard`: Copy all files to clipboard (also available via status bar button)

## Installation

1. Install the extension from the VS Code marketplace
2. The extension will automatically activate when you open a workspace
3. Look for the copy icon in the status bar

## Usage Tips

- The extension reads text files only - binary files are automatically skipped
- File paths in the output use forward slashes (/) for consistency
- Update the `ignore.txt` file to customize which files to exclude
- The extension monitors the ignore file for changes automatically
