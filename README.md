# Workflow MCP Server

MCP server providing task evaluation, environment safety checks, and reasoning tools for AI assistants.

## Features

- **evaluate_task**: Assess task complexity (4 criteria: multi-step, unclear requirements, subtasks, bug risk)
- **env_verify**: Validate package installation safety before execution
- **think**: Log complex reasoning processes

## Installation

```bash
npm install
npm run build
```

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Docker
```bash
docker build -t ai-workflow-mcp .
docker run ai-workflow-mcp
```

## Configuration

Add to your MCP client config (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "ai-workflow": {
      "command": "node",
      "args": ["/path/to/mcp/dist/server.js"]
    }
  }
}
```

## Task Evaluation Criteria

Flags ≥ 2 → Build memory-bank/

- Multi-step? (requires multiple implementation steps)
- Unclear requirements? (needs clarification)
- Can break into subtasks? (independent components)
- Cannot guarantee bug-free? (high complexity/edge cases)

## License

MIT
