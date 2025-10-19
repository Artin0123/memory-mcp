## MCP 輸入輸出設計

### 輸入格式
```javascript
{
  "projectPath": "C:\\Users\\artin\\Sync\\coding\\test",
  "entries": [
    {
      "what": "實作五子棋遊戲",
      "why": "用戶需求",
      "outcome": "完成基礎版（15x15 棋盤、勝負判定）",
      "task_context": "五子棋遊戲"
    }
  ]
}
```

### MCP 核心邏輯

```javascript
// 1. 讀取現有 memory.json（位於 projectPath）
const memoryPath = path.join(projectPath, '.memory', 'memory.json');
let memory = readJSON(memoryPath) || { entries: [], meta: {} };

// 2. 新增 entry
memory.entries.push(...newEntries);

// 3. Token 估算（粗略）
function estimateTokens(entry) {
  const text = JSON.stringify(entry);
  const chinese = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const english = (text.match(/[a-zA-Z]/g) || []).length;
  const symbols = text.length - chinese - english;
  
  return Math.ceil(chinese * 1.3 + english * 0.3 + symbols * 0.6);
}

// 4. FIFO 刪除（保持 ≤ 1000 tokens）
let totalTokens = memory.entries.reduce((sum, e) => sum + estimateTokens(e), 0);

while (totalTokens > 1000 && memory.entries.length > 1) {
  const removed = memory.entries.shift(); // 刪除最舊的
  totalTokens -= estimateTokens(removed);
}

// 5. 更新 meta
memory.meta = {
  total_entries: memory.entries.length,
  estimated_tokens: totalTokens,
  last_updated: new Date().toISOString().split('T')[0]
};

// 6. 寫回檔案
writeJSON(memoryPath, memory);
```

### 輸出格式
```json
{
  "success": true,
  "message": "已記錄 1 個項目，當前總計 5 個項目（約 650 tokens）"
}
```

## 欄位結構

```json
{
  "what": "實作五子棋遊戲",
  "why": "用戶想要練習 Canvas API 和遊戲邏輯",
  "outcome": "完成基礎版（15x15 棋盤、勝負判定）",
  "constraints": "必須支援悔棋功能，不需要 AI 對手",
  "dependencies": "依賴 html5-canvas，無外部套件"
}
```