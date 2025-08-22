# Copy All Files

A simple VS Code extension to copy file contents or the project structure (tree) to your clipboard, with customizable ignore rules.

## Usage

-   **Copy Content**: Click the **`$(copy)`** icon in the status bar. This copies the text content of all allowed files.

-   **Copy Tree**: Run `Copy Project Structure (Tree)` from the Command Palette (`Ctrl+Shift+P`). This copies the visual layout of your files and folders.

---

## Configuration

You can add custom ignore rules by editing the `.vscode/copy-all-files/ignore.txt` file in your workspace. It will be created with the following default content:

```ini
# Add relative paths to ignore, one per line
Examples:
prueba\test.py
src\temp
docs\draft.md
*.backup
temp-folder
specific-file.txt
logs\*.log
build\output
```

## Example

Given the following project structure:

```ini
my-project/
├── src/
│   ├── index.js
│   └── styles.css
├── images/
│   └── logo.png
└── package.json
```

### Content Output

The **Copy Content** command will generate this in your clipboard, ignoring the `.png` file:

```ini
# src/index.js

console.log("Hello1!");
console.log("Hello2!");
console.log("Hello3!");
console.log("Hello4!");

---

# src/styles.css

body {
  margin: 0;
}

---

# package.json

{
  "name": "my-project",
  "version": "1.0.0"
}
```

### Tree Output

The **Copy Tree** command will generate this, showing the file structure including the `.png`:

```ini
my-project/
├── src/
│   ├── index.js
│   └── styles.css
├── images/
│   └── logo.png
└── package.json
```
