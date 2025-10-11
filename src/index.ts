#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Evaluation criteria (Flags ≥ 2 → Build memory-bank/):
// - Multi step? (requires multiple implementation steps)
// - Unclear requirements? (needs clarification/exploration)
// - Can break into smaller sub-tasks? (independent components)
// - Cannot guarantee bug-free completion? (high complexity/edge cases)

export const stateless = true;

export default function createStatelessServer() {
    const server = new McpServer({
        name: "workflow-mcp",
        version: "1.0.0",
    });

    server.tool(
        "evaluate_task",
        "Evaluate task complexity. Use for any task involving logic, algorithms, or multiple components. Skip only for trivial changes (styling, typos).",
        {
            is_multi_step: z.boolean().describe("Requires multiple implementation steps?"),
            has_unclear_requirements: z.boolean().describe("Requirements are vague or need clarification?"),
            can_break_into_subtasks: z.boolean().describe("Can be divided into independent subtasks?"),
            cannot_guarantee_bugfree: z.boolean().describe("High risk of edge cases or bugs?"),
        },
        async ({ is_multi_step, has_unclear_requirements, can_break_into_subtasks, cannot_guarantee_bugfree }) => {
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
        "env_verify",
        "Mandatory before package installation. Blocks unsafe operations.",
        {
            command: z.string().describe("Installation command to verify"),
            env_verified: z.boolean().describe("Has environment been checked?"),
        },
        async ({ command, env_verified }) => {
            if (!env_verified) {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({ safe: false, reason: "Environment not verified" }),
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
            thought: z.string().describe("The thought or reasoning process"),
        },
        async ({ thought }) => {
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

