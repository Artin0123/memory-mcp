# Memory MCP

This repository implements a small MCP server that exposes a `mem_write` tool for recording structured memory entries to a per-project JSON file (`.memory/memory.json`). The server is intentionally simple: it stores entries provided by the AI and enforces a token-budgeted FIFO eviction policy.

## Installation

```powershell
npm install
npm run build
```

## Configuration

Add this server to your MCP client configuration. Example:

```json
{
  "mcpServers": {
    "memory-mcp": {
      "command": "node",
      "args": ["/path/to/mcp/dist/server.js"]
    }
  }
}
```

## Features

This server does not summarize or decide what to store by itself. User should decide when to call `mem_write`.

- Tool: `mem_write` — record memories for a project (JSON storage)
- Token estimation and FIFO eviction to keep estimated tokens ≤ 1000
- Auto-creates `.memory/memory.json` if missing

## mem_write behavior

Inputs:
- `projectPath` (string): absolute project path provided by the AI
- `entries` (array): list of memory entry objects. Each entry has:
  - `what` (string)
  - `why` (string)
  - `outcome` (string)
  - `task_context`, `constraints`, `dependencies` (optional strings)

Storage:
- Memory is stored at `<projectPath>/.memory/memory.json`:

  {
    "entries": [ ... ],
    "meta": {
      "total_entries": number,
      "estimated_tokens": number,
      "last_updated": "YYYY-MM-DD"
    }
  }

Token estimation (approximate):
- Chinese chars ≈ 1.3 tokens each
- English letters ≈ 0.3 tokens each
- Other symbols ≈ 0.6 tokens each

Eviction policy:
- After appending new entries, the server computes an estimated total token usage.
- If the total exceeds 1000 tokens, it removes the oldest entries (FIFO) one-by-one until the total is ≤ 1000.

Return value:
- On success the tool returns a JSON text message with `success: true` and a short summary.

## License

MIT
