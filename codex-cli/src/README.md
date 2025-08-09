# codex-cli-sdk

> A TypeScript SDK that lets you **run OpenAI Codex CLI programmatically** using the **same API style as the Claude Code TypeScript SDK** (e.g. `query()` returning an async iterator).
> Under the hood, it shells out to the `codex` binary (`codex exec`), streams output, and yields structured events.

---

## Why?

* **Drop-in style**: Mirrors the Claude Code SDK's `query()` API so you can reuse patterns.
* **Programmatic-only auth**: Authenticate via `OPENAI_API_KEY` environment variable — no ChatGPT plan login flow.
* **Full Codex CLI control**: Pass sandbox, approval, and model options directly from code.
* **Cross-platform**: Works anywhere the Codex CLI is supported.

---

## Requirements

* Node.js 18+
* [OpenAI Codex CLI](https://github.com/openai/codex) installed and on your PATH:

  * `npm install -g @openai/codex`
  * `brew install codex`
  * Or download a binary from [GitHub Releases](https://github.com/openai/codex/releases)

---

## Install

```bash
npm install @openai/codex
# or
pnpm add @openai/codex
# or
yarn add @openai/codex
```

---

## Quick start

```ts
import { query } from "@openai/codex";

// Ensure you've set your API key:
// export OPENAI_API_KEY="sk-..."

for await (const event of query({
  prompt: "Explain what src/utils/date.ts does and write 3 unit tests",
})) {
  if (event.msg.type === "agent_message") {
    console.log(event.msg.message);
  }
}
```

---

## API

### `query(args): AsyncGenerator<SDKOutputEvent>`

```ts
interface QueryArgs {
  prompt: string;
  abortController?: AbortController;
  options?: Options;
}

type Options = {
  // Override a configuration value from ~/.codex/config.toml
  config?: string;
  // Optional image(s) to attach to the initial prompt
  image?: string;
  // Model the agent should use
  model?: string;
  // Select the sandbox policy [read-only, workspace-write, danger-full-access]
  sandbox?: string;
  // Configuration profile from config.toml
  profile?: string;
  // Convenience alias for low-friction sandboxed automatic execution
  fullAuto?: boolean;
  // Skip all confirmation prompts and execute commands without sandboxing
  dangerouslyBypassApprovalsAndSandbox?: boolean;
  // Tell the agent to use the specified directory as its working root
  cd?: string;
  // Allow running Codex outside a Git repository
  skipGitRepoCheck?: boolean;
  // Specifies color settings for use in the output [always, never, auto]
  color?: string;
  // Specifies file where the last message from the agent should be written
  outputLastMessage?: string;
};

type SDKOutputEvent = {
  id: string;
  msg: EventMsg;
};

// Core event types with their actual structure
type SDKAgentMessage = {
  type: "agent_message";
  message: string;
};

type SDKAgentMessageDelta = {
  type: "agent_message_delta";
  delta: string;
};

type SDKErrorEvent = {
  type: "error";
  message: string;
};

type SDKTaskComplete = {
  type: "task_complete";
  last_agent_message?: string | null;
};

type SDKExecCommandBegin = {
  type: "exec_command_begin";
  call_id: string;
  command: Array<string>;
  cwd: string;
};

type SDKExecCommandEnd = {
  type: "exec_command_end";
  call_id: string;
  stdout: string;
  stderr: string;
  exit_code: number;
  duration: DurationJSON;
};

type SDKApplyPatchApprovalRequest = {
  type: "apply_patch_approval_request";
  call_id: string;
  changes: Record<string, FileChange>;
  reason?: string | null;
  grant_root?: string | null;
};

// Complete union of all event types
type EventMsg =
  | SDKErrorEvent
  | SDKTaskComplete
  | SDKAgentMessage
  | SDKAgentMessageDelta
  | SDKExecCommandBegin
  | SDKExecCommandEnd
  | SDKApplyPatchApprovalRequest;

// Note: This is a subset of available event types. 
// See types.ts for the complete list including reasoning, MCP tool calls, 
// patch operations, and more.

// Utility types
type DurationJSON = { secs: number; nanos: number };
type ExecOutputStream = "stdout" | "stderr";
type FileChange =
  | { add: { content: string } }
  | { delete: {} }
  | { update: { unified_diff: string; move_path?: string | null } };
```

---

## Option mapping (SDK → Codex CLI)

| SDK option                           | Codex CLI flag                                    |
| ------------------------------------ | ------------------------------------------------- |
| `model`                              | `--model`                                         |
| `sandbox`                            | `--sandbox`                                       |
| `profile`                            | `--profile`                                       |
| `config`                             | `--config`                                        |
| `cd`                                 | `--cd`                                            |
| `fullAuto`                           | `--full-auto`                                     |
| `dangerouslyBypassApprovalsAndSandbox` | `--dangerously-bypass-approvals-and-sandbox` |
| `skipGitRepoCheck`                   | `--skip-git-repo-check`                           |
| `color`                              | `--color`                                         |
| `outputLastMessage`                  | `--output-last-message`                           |
| `image`                              | `--image`                                         |

---

## Authentication

**Only** API key authentication is supported.

```bash
export OPENAI_API_KEY="sk-..."
```

If the environment variable is not set, the SDK will throw an error before launching Codex.

---

## Examples

### Fully non-interactive

```ts
for await (const event of query({
  prompt: "Explain src/regex.ts and propose clearer names",
  options: { sandbox: "read-only" },
})) {
  if (event.msg.type === "agent_message") {
    process.stdout.write(event.msg.message);
  }
}
```

### With profile and config overrides

```ts
for await (const event of query({
  prompt: "Write unit tests for utils/date.ts",
  options: {
    profile: "full_auto",
    config: "disable_response_storage=true",
  },
})) {
  if (event.msg.type === "agent_message") {
    process.stdout.write(event.msg.message);
  }
}
```

### Using fullAuto for automatic execution

```ts
for await (const event of query({
  prompt: "Create a new file called test.txt with some content",
  options: { fullAuto: true },
})) {
  if (event.msg.type === "agent_message") {
    console.log(event.msg.message);
  }
}
```

---

## Error handling

* Non-zero exit code ⇒ process rejection
* Aborted requests ⇒ `AbortError` thrown
* Missing `codex` binary ⇒ process spawn error

---

## Streaming model

The SDK yields `SDKOutputEvent` objects containing:

1. `id`: Unique event identifier
2. `msg`: The actual event payload with a `type` discriminator

Common event types:
- `agent_message`: Final agent response text (`message: string`)
- `agent_message_delta`: Streaming text chunks (`delta: string`)
- `exec_command_begin`: Command execution started (`command: string[], cwd: string`)
- `exec_command_end`: Command execution completed (`stdout: string, stderr: string, exit_code: number`)
- `apply_patch_approval_request`: File change requests (`changes: Record<string, FileChange>`)
- `error`: Error messages (`message: string`)
- `task_complete`: Task finished (`last_agent_message?: string`)
- `token_count`: Token usage metrics (`input_tokens: number, output_tokens: number, total_tokens: number`)