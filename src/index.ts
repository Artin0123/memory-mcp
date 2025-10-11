#!/usr/bin/env node

// @ts-ignore - Smithery SDK types may not be fully available locally
import { McpServer } from "@smithery/sdk/server";

// Evaluation criteria (Flags ≥ 2 → Build memory-bank/):
// - Multi step? (requires multiple implementation steps)
// - Unclear requirements? (needs clarification/exploration)
// - Can break into smaller sub-tasks? (independent components)
// - Cannot guarantee bug-free completion? (high complexity/edge cases)

const server = new McpServer({
    name: "workflow-mcp",
    version: "1.0.0",
});

server.tool(
    "evaluate_task",
    "Evaluate task complexity. Use for any task involving logic, algorithms, or multiple components. Skip only for trivial changes (styling, typos).",
    {
        is_multi_step: {
            type: "boolean",
            description: "Requires multiple implementation steps?",
        },
        has_unclear_requirements: {
            type: "boolean",
            description: "Requirements are vague or need clarification?",
        },
        can_break_into_subtasks: {
            type: "boolean",
            description: "Can be divided into independent subtasks?",
        },
        cannot_guarantee_bugfree: {
            type: "boolean",
            description: "High risk of edge cases or bugs?",
        },
    },
    async ({
        is_multi_step,
        has_unclear_requirements,
        can_break_into_subtasks,
        cannot_guarantee_bugfree,
    }: {
        is_multi_step: boolean;
        has_unclear_requirements: boolean;
        can_break_into_subtasks: boolean;
        cannot_guarantee_bugfree: boolean;
    }) => {
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
                    }),
                },
            ],
        };
    }
);

server.tool(
    "verify_install_safety",
    "Mandatory before package installation. Blocks unsafe operations.",
    {
        command: {
            type: "string",
            description: "Installation command to verify",
        },
        env_verified: {
            type: "boolean",
            description: "Has environment been checked?",
        },
    },
    async ({ command, env_verified }: { command: string; env_verified: boolean }) => {
        if (!env_verified) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            safe: false,
                            reason: "Environment not verified",
                        }),
                    },
                ],
            };
        }

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({ safe: true }),
                },
            ],
        };
    }
);

server.tool(
    "think",
    "Use for complex reasoning or caching thoughts. Logs process without external changes.",
    {
        thought: {
            type: "string",
            description: "The thought or reasoning process",
        },
    },
    async ({ thought }: { thought: string }) => {
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

server.start();
