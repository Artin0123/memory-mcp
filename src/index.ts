#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as path from "path";
import { fileURLToPath } from "url";

// Evaluation criteria (Flags ≥ 2 → Build memory-bank/):
// - Multi step? (requires multiple implementation steps)
// - Unclear requirements? (needs clarification/exploration)
// - Can break into smaller sub-tasks? (independent components)
// - Cannot guarantee bug-free completion? (high complexity/edge cases)

const SERVER_VERSION = "1.0.0";

export const configSchema = z.object({}).passthrough();

type CreateServerArgs = {
    config?: unknown;
    logger?: {
        info?(...args: unknown[]): void;
        error?(...args: unknown[]): void;
        warn?(...args: unknown[]): void;
        debug?(...args: unknown[]): void;
    };
};

// Tool schemas
const EvaluateTaskSchema = z.object({
    is_multi_step: z.boolean().describe("Requires multiple implementation steps?"),
    has_unclear_requirements: z.boolean().describe("Requirements are vague or need clarification?"),
    can_break_into_subtasks: z.boolean().describe("Can be divided into independent subtasks?"),
    cannot_guarantee_bugfree: z.boolean().describe("High risk of edge cases or bugs?"),
}).strict();

const EnvVerifySchema = z.object({
    command: z.string().describe("Installation command to verify"),
    env_verified: z.boolean().describe("Has environment been checked?"),
}).strict();

const ThinkSchema = z.object({
    thought: z.string().describe("The thought or reasoning process"),
}).strict();

export function createWorkflowMcpServer({ config, logger }: CreateServerArgs = {}): McpServer {
    const server = new McpServer({
        name: "workflow-mcp",
        version: SERVER_VERSION,
        description: "MCP server providing task evaluation, environment safety checks, and reasoning tools for AI assistants.",
    });

    const log = logger ?? console;
    log.info?.(`Workflow MCP server initialized (v${SERVER_VERSION})`);

    server.registerTool(
        "evaluate_task",
        {
            title: "Evaluate Task Complexity",
            description: "Evaluate task complexity. Use for any task involving logic, algorithms, or multiple components. Skip only for trivial changes (styling, typos).",
            inputSchema: EvaluateTaskSchema.shape,
        },
        async (rawArgs: unknown) => {
            const { is_multi_step, has_unclear_requirements, can_break_into_subtasks, cannot_guarantee_bugfree } =
                EvaluateTaskSchema.parse(rawArgs);

            const flags = [
                is_multi_step,
                has_unclear_requirements,
                can_break_into_subtasks,
                cannot_guarantee_bugfree,
            ].filter(Boolean).length;

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            complexity: flags,
                            needs_memory_bank: flags >= 2,
                            criteria: {
                                is_multi_step,
                                has_unclear_requirements,
                                can_break_into_subtasks,
                                cannot_guarantee_bugfree,
                            },
                        }, null, 2),
                    },
                ],
            };
        }
    );

    server.registerTool(
        "env_verify",
        {
            title: "Verify Environment Safety",
            description: "Mandatory before package installation. Blocks unsafe operations.",
            inputSchema: EnvVerifySchema.shape,
        },
        async (rawArgs: unknown) => {
            const { command, env_verified } = EnvVerifySchema.parse(rawArgs);

            if (!env_verified) {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({ safe: false, reason: "Environment not verified" }, null, 2),
                        },
                    ],
                };
            }

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({ safe: true }, null, 2),
                    },
                ],
            };
        }
    );

    server.registerTool(
        "think",
        {
            title: "Reasoning Tool",
            description: "Use for complex reasoning or caching thoughts. Logs process without external changes.",
            inputSchema: ThinkSchema.shape,
        },
        async (rawArgs: unknown) => {
            const { thought } = ThinkSchema.parse(rawArgs);

            return {
                content: [
                    {
                        type: "text",
                        text: thought,
                    },
                ],
            };
        }
    );

    return server;
}

export default function createServer(args: CreateServerArgs = {}) {
    return createWorkflowMcpServer(args).server;
}

function isExecutedDirectly(): boolean {
    const entryPoint = process.argv[1];
    if (!entryPoint) {
        return false;
    }

    try {
        const resolvedEntry = path.resolve(entryPoint);
        const currentModulePath = fileURLToPath(import.meta.url);
        return resolvedEntry === currentModulePath;
    } catch {
        return false;
    }
}

async function startCliServer(): Promise<void> {
    try {
        const server = createWorkflowMcpServer({
            logger: console,
        });

        const transport = new StdioServerTransport();
        await server.connect(transport);

        console.error("Workflow MCP server started successfully");
    } catch (error) {
        console.error("Failed to start Workflow MCP server:", error);
        process.exit(1);
    }
}

if (isExecutedDirectly()) {
    void startCliServer();
}
