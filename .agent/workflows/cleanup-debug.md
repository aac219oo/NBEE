---
description: 清理 AI 產生的 debug 檔案和臨時檔案
---

# 清理 Debug 檔案工作流程

此工作流程用於清理 AI 在開發過程中產生的臨時 debug 檔案。

## 執行步驟

// turbo-all

### 1. 檢查是否有 debug 檔案

```bash
find . -maxdepth 3 -name "debug-*" -o -name "*.debug.*" -o -name "*_review.png" -o -name "screenshot_review.py" | grep -v node_modules
```

### 2. 列出將被刪除的檔案

```bash
git status --short | grep -E "(debug-|\.debug\.|_review\.png|screenshot_review\.py)"
```

### 3. 刪除 debug 檔案

```bash
rm -f debug-*.ts debug-*.js debug-*.tsx debug-*.jsx
rm -f packages/*/debug-*.ts packages/*/debug-*.js
rm -f screenshot_review.py *_review.png debug_*.png
```

### 4. 驗證清理結果

```bash
git status
```

## 注意事項

- 這些檔案已經被加入到 `.gitignore` 中,不會被提交到版本控制
- 如果有重要的 debug 檔案,請在執行前先備份
- 此工作流程只會刪除符合特定模式的檔案,不會影響正式的程式碼檔案
