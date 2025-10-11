#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Evaluation criteria (Flags ≥ 2 → Build memory-bank/):
// - Multi step? (requires multiple implementation steps)
// - Unclear requirements? (needs clarification/exploration)
// - Can break into smaller sub-tasks? (independent components)
// - Cannot guarantee bug-free completion? (high complexity/edge cases)

const server = new Server(
  {
    name: "ai-workflow-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "evaluate_task",
        description: "Evaluate task complexity. Use for any task involving logic, algorithms, or multiple components. Skip only for trivial changes (styling, typos).",
        inputSchema: {
          type: "object",
          properties: {
            is_multi_step: { type: "boolean", description: "Requires multiple implementation steps?" },
            has_unclear_requirements: { type: "boolean", description: "Requirements are vague or need clarification?" },
            can_break_into_subtasks: { type: "boolean", description: "Can be divided into independent subtasks?" },
            cannot_guarantee_bugfree: { type: "boolean", description: "High risk of edge cases or bugs?" }
          },
          required: ["is_multi_step", "has_unclear_requirements", "can_break_into_subtasks", "cannot_guarantee_bugfree"]
        }
      },
      {
        name: "env_verify",
        description: "Mandatory before package installation. Blocks unsafe operations.",
        inputSchema: {
          type: "object",
          properties: {
            command: { type: "string", description: "Installation command to verify" },
            env_verified: { type: "boolean", description: "Has environment been checked?" }
          },
          required: ["command", "env_verified"]
        }
      },
      {
        name: "think",
        description: "Use for complex reasoning or caching thoughts. Logs process without external changes.",
        inputSchema: {
          type: "object",
          properties: {
            thought: { type: "string", description: "The thought or reasoning process" }
          },
          required: ["thought"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "evaluate_task") {
    const {
      is_multi_step,
      has_unclear_requirements,
      can_break_into_subtasks,
      cannot_guarantee_bugfree
    } = args as {
      is_multi_step: boolean;
      has_unclear_requirements: boolean;
      can_break_into_subtasks: boolean;
      cannot_guarantee_bugfree: boolean;
    };

    const flags = [
      is_multi_step,
      has_unclear_requirements,
      can_break_into_subtasks,
      cannot_guarantee_bugfree
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
              cannot_guarantee_bugfree
            }
          })
        }
      ]
    };
  }

  if (name === "env_verify") {
    const { command, env_verified } = args as {
      command: string;
      env_verified: boolean;
    };

    if (!env_verified) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ safe: false, reason: "Environment not verified" })
          }
        ]
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ safe: true })
        }
      ]
    };
  }

  if (name === "think") {
    const { thought } = args as { thought: string };

    return {
      content: [
        {
          type: "text",
          text: thought
        }
      ]
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
