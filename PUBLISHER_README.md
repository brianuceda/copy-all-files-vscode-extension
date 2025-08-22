# Copy All Files - VS Code Extension

## Login & Setup

1. **Azure DevOps**: https://dev.azure.com/

2. **Create Personal Access Token**: https://dev.azure.com/[organization]/_usersSettings/tokens

   - Scopes: **Marketplace** → **Manage**

3. **Login**:

   ```bash
   npm install -g @vscode/vsce
   vsce login ...
   ```

## Publish New Version

- **Publisher Dashboard**: https://marketplace.visualstudio.com/manage/publishers

- **Publish patch**: `vsce publish patch` (0.1.x → 0.1.y)
- **Publish minor**: `vsce publish minor` (0.1.x → 0.2.0)

- **Package only**: `vsce package`
