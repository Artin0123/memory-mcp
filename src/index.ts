import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

const SERVER_VERSION = "1.0.0";

interface MemoryEntry {
    what: string;
    why: string;
    outcome: string;
    task_context?: string;
    constraints?: string;
    dependencies?: string;
}

interface Memory {
    entries: MemoryEntry[];
    meta: {
        total_entries: number;
        estimated_tokens: number;
        last_updated: string;
    };
}

// Token 估算函數
function estimateTokens(entry: MemoryEntry): number {
    const text = JSON.stringify(entry);
    const chinese = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const english = (text.match(/[a-zA-Z]/g) || []).length;
    const symbols = text.length - chinese - english;

    return Math.ceil(chinese * 1.3 + english * 0.3 + symbols * 0.6);
}

// 讀取 JSON 檔案
function readJSON(filePath: string): Memory | null {
    try {
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(content);
        }
    } catch (error) {
        console.error(`Error reading JSON file: ${error}`);
    }
    return null;
}

// 寫入 JSON 檔案
function writeJSON(filePath: string, data: Memory): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function createMemoryMcpServer(options: { logger: Console }): McpServer {
    const server = new McpServer({
        name: "memory-mcp",
        version: SERVER_VERSION,
    });

    // 定義 mem_write 工具
    server.tool(
        "mem_write",
        "Record workflow memories with FIFO eviction (keep ≤ 1000 tokens)",
        {
            projectPath: z.string().describe("Project path (provided by AI)"),
            entries: z.array(z.object({
                what: z.string().describe("What was done"),
                why: z.string().describe("Why it was done"),
                outcome: z.string().describe("What was the outcome"),
                task_context: z.string().optional().describe("Task context"),
                constraints: z.string().optional().describe("Constraints"),
                dependencies: z.string().optional().describe("Dependencies")
            })).describe("List of memory entries")
        },
        async ({ projectPath, entries }) => {
            try {
                // 1. 讀取現有 memory.json
                const memoryPath = path.join(projectPath, '.memory', 'memory.json');
                let memory: Memory = readJSON(memoryPath) || {
                    entries: [],
                    meta: {
                        total_entries: 0,
                        estimated_tokens: 0,
                        last_updated: ""
                    }
                };

                // 2. 新增 entries
                memory.entries.push(...entries);

                // 3. 計算總 tokens
                let totalTokens = memory.entries.reduce(
                    (sum, e) => sum + estimateTokens(e),
                    0
                );

                // 4. FIFO 刪除（保持 ≤ 1000 tokens）
                while (totalTokens > 1000 && memory.entries.length > 1) {
                    const removed = memory.entries.shift()!;
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

                return {
                    content: [{
                        type: "text" as const,
                        text: JSON.stringify({
                            success: true,
                            message: `Recorded ${entries.length} entries, current total ${memory.meta.total_entries} entries (approx. ${memory.meta.estimated_tokens} tokens)`
                        }, null, 2)
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text" as const,
                        text: JSON.stringify({
                            success: false,
                            message: `Write failed: ${error}`
                        }, null, 2)
                    }],
                    isError: true
                };
            }
        }
    );

    return server;
}

async function startCliServer(): Promise<void> {
    try {
        const server = createMemoryMcpServer({
            logger: console,
        });

        const transport = new StdioServerTransport();
        await server.connect(transport);

        console.error("Memory MCP server started successfully");
    } catch (error) {
        console.error("Failed to start Memory MCP server:", error);
        process.exit(1);
    }
}

// Start the server
void startCliServer();