export type Options = {
  // ==These are all options from the CLI==
  // Override a configuration value that would otherwise be loaded from ~/.codex/config.toml. Use a dotted path (foo.bar.baz) to override nested
  // values. The value portion is parsed as JSON. If it fails to parse as JSON, the raw string is used as a literal
  config?: string;
  // Optional image(s) to attach to the initial prompt
  image?: string;
  // Model the agent should use
  model?: string;
  // Select the sandbox policy to use when executing model-generated shell commands [possible values: read-only, workspace-write, danger-full-access]
  sandbox?: string;
  // Configuration profile from config.toml to specify default options
  profile?: string;
  // Convenience alias for low-friction sandboxed automatic execution (-a on-failure, --sandbox workspace-write)
  fullAuto?: boolean;
  // Skip all confirmation prompts and execute commands without sandboxing. EXTREMELY DANGEROUS. Intended solely for running in environments that are
  // externally sandboxed
  dangerouslyBypassApprovalsAndSandbox?: boolean;
  // Tell the agent to use the specified directory as its working root
  cd?: string;
  // Allow running Codex outside a Git repository
  skipGitRepoCheck?: boolean;
  // Specifies color settings for use in the output [default: auto] [possible values: always, never, auto]
  color?: string;
  // Specifies file where the last message from the agent should be written
  outputLastMessage?: string;
};

/**
 * Top-level event envelope from the agent.
 * Rust: `Event { id: String, msg: EventMsg }`
 */
export type SDKOutputEvent = {
  id: string;
  msg: EventMsg;
};

/**
 * Discriminated union over `msg.type` (snake_case).
 * Mirrors Rust `EventMsg` and all payload types.
 */
export type EventMsg =
  | SDKErrorEvent
  | SDKTaskStarted
  | SDKTaskComplete
  | SDKTokenCount
  | SDKAgentMessage
  | SDKAgentMessageDelta
  | SDKAgentReasoning
  | SDKAgentReasoningDelta
  | SDKAgentReasoningRawContent
  | SDKAgentReasoningRawContentDelta
  | SDKSessionConfigured
  | SDKMcpToolCallBegin
  | SDKMcpToolCallEnd
  | SDKExecCommandBegin
  | SDKExecCommandOutputDelta
  | SDKExecCommandEnd
  | SDKExecApprovalRequest
  | SDKApplyPatchApprovalRequest
  | SDKBackgroundEvent
  | SDKPatchApplyBegin
  | SDKPatchApplyEnd
  | SDKTurnDiff
  | SDKGetHistoryEntryResponse
  | SDKPlanUpdate
  | SDKShutdownComplete;

/**
 * Basic scalar helpers for Rust serde outputs.
 */
export type DurationJSON = { secs: number; nanos: number };
export type ExecOutputStream = "stdout" | "stderr";

/**
 * Token usage accounting.
 * Rust: `TokenUsage`
 */
export type TokenUsage = {
  input_tokens: number;
  cached_input_tokens?: number | null;
  output_tokens: number;
  reasoning_output_tokens?: number | null;
  total_tokens: number;
};

/**
 * History entry payload.
 * Rust: `message_history::HistoryEntry`
 */
export type HistoryEntry = {
  session_id: string;
  ts: number;
  text: string;
};

/**
 * Background message event.
 * Rust: `BackgroundEventEvent`
 */
export type SDKBackgroundEvent = {
  type: "background_event";
  message: string;
};

/**
 * Error event.
 * Rust: `ErrorEvent`
 */
export type SDKErrorEvent = {
  type: "error";
  message: string;
};

/**
 * Task started (no payload).
 */
export type SDKTaskStarted = {
  type: "task_started";
};

/**
 * Task completion event.
 * Rust: `TaskCompleteEvent`
 */
export type SDKTaskComplete = {
  type: "task_complete";
  last_agent_message?: string | null;
};

/**
 * Token count metrics.
 * Rust: `TokenCount(TokenUsage)`
 */
export type SDKTokenCount = {
  type: "token_count";
  input_tokens: number;
  cached_input_tokens?: number | null;
  output_tokens: number;
  reasoning_output_tokens?: number | null;
  total_tokens: number;
};

/**
 * Agent text message.
 * Rust: `AgentMessageEvent`
 */
export type SDKAgentMessage = {
  type: "agent_message";
  message: string;
};

/**
 * Agent message delta.
 * Rust: `AgentMessageDeltaEvent`
 */
export type SDKAgentMessageDelta = {
  type: "agent_message_delta";
  delta: string;
};

/**
 * Agent reasoning (redacted summary).
 * Rust: `AgentReasoningEvent`
 */
export type SDKAgentReasoning = {
  type: "agent_reasoning";
  text: string;
};

/**
 * Agent reasoning delta.
 * Rust: `AgentReasoningDeltaEvent`
 */
export type SDKAgentReasoningDelta = {
  type: "agent_reasoning_delta";
  delta: string;
};

/**
 * Agent raw chain-of-thought (if enabled).
 * Rust: `AgentReasoningRawContentEvent`
 */
export type SDKAgentReasoningRawContent = {
  type: "agent_reasoning_raw_content";
  text: string;
};

/**
 * Agent raw chain-of-thought delta.
 * Rust: `AgentReasoningRawContentDeltaEvent`
 */
export type SDKAgentReasoningRawContentDelta = {
  type: "agent_reasoning_raw_content_delta";
  delta: string;
};

/**
 * Session configured ack.
 * Rust: `SessionConfiguredEvent`
 */
export type SDKSessionConfigured = {
  type: "session_configured";
  session_id: string; // UUID string
  model: string;
  history_log_id: number;
  history_entry_count: number;
};

/**
 * MCP tool call invocation details.
 * Rust: `McpInvocation`
 */
export type McpInvocation = {
  server: string;
  tool: string;
  arguments?: unknown;
};

/**
 * Result<T, E> shape in serde JSON.
 */
export type SerdeResult<T, E> = { Ok: T } | { Err: E };

/**
 * MCP tool call result payload (opaque; mirrors mcp_types::CallToolResult).
 * We include is_error?: boolean since server checks it.
 */
export type CallToolResult = {
  is_error?: boolean | null;
  [k: string]: unknown;
};

/**
 * MCP tool call begin.
 * Rust: `McpToolCallBeginEvent`
 */
export type SDKMcpToolCallBegin = {
  type: "mcp_tool_call_begin";
  call_id: string;
  invocation: McpInvocation;
};

/**
 * MCP tool call end.
 * Rust: `McpToolCallEndEvent`
 */
export type SDKMcpToolCallEnd = {
  type: "mcp_tool_call_end";
  call_id: string;
  invocation: McpInvocation;
  duration: DurationJSON;
  result: SerdeResult<CallToolResult, string>;
};

/**
 * Exec command begin.
 * Rust: `ExecCommandBeginEvent`
 */
export type SDKExecCommandBegin = {
  type: "exec_command_begin";
  call_id: string;
  command: Array<string>;
  cwd: string;
};

/**
 * Exec command output chunk (stdout/stderr).
 * Rust: `ExecCommandOutputDeltaEvent`
 * `chunk` is base64-encoded bytes (serde_bytes::ByteBuf) in JSON.
 */
export type SDKExecCommandOutputDelta = {
  type: "exec_command_output_delta";
  call_id: string;
  stream: ExecOutputStream;
  chunk: string; // base64
};

/**
 * Exec command end.
 * Rust: `ExecCommandEndEvent`
 */
export type SDKExecCommandEnd = {
  type: "exec_command_end";
  call_id: string;
  stdout: string;
  stderr: string;
  exit_code: number;
  duration: DurationJSON;
};

/**
 * Exec approval request.
 * Rust: `ExecApprovalRequestEvent`
 */
export type SDKExecApprovalRequest = {
  type: "exec_approval_request";
  call_id: string;
  command: Array<string>;
  cwd: string;
  reason?: string | null;
};

/**
 * FileChange enum (externally tagged in JSON).
 * Rust: `FileChange`
 * - { "add": { content } }
 * - { "delete": {} }
 * - { "update": { unified_diff, move_path } }
 */
export type FileChange =
  | { add: { content: string } }
  // eslint-disable-next-line
  | { delete: {} }
  | { update: { unified_diff: string; move_path?: string | null } };

/**
 * Apply patch approval request.
 * Rust: `ApplyPatchApprovalRequestEvent`
 */
export type SDKApplyPatchApprovalRequest = {
  type: "apply_patch_approval_request";
  call_id: string;
  changes: Record<string, FileChange>;
  reason?: string | null;
  grant_root?: string | null;
};

/**
 * Patch apply begin.
 * Rust: `PatchApplyBeginEvent`
 */
export type SDKPatchApplyBegin = {
  type: "patch_apply_begin";
  call_id: string;
  auto_approved: boolean;
  changes: Record<string, FileChange>;
};

/**
 * Patch apply end.
 * Rust: `PatchApplyEndEvent`
 */
export type SDKPatchApplyEnd = {
  type: "patch_apply_end";
  call_id: string;
  stdout: string;
  stderr: string;
  success: boolean;
};

/**
 * Turn diff.
 * Rust: `TurnDiffEvent`
 */
export type SDKTurnDiff = {
  type: "turn_diff";
  unified_diff: string;
};

/**
 * Get history entry response.
 * Rust: `GetHistoryEntryResponseEvent`
 */
export type SDKGetHistoryEntryResponse = {
  type: "get_history_entry_response";
  offset: number;
  log_id: number;
  entry?: HistoryEntry | null;
};

/**
 * Plan update event.
 * Rust: `UpdatePlanArgs` (from plan_tool.rs)
 */
export type StepStatus = "pending" | "in_progress" | "completed";

export type PlanItemArg = {
  step: string;
  status: StepStatus;
};

export type UpdatePlanArgs = {
  explanation?: string | null;
  plan: Array<PlanItemArg>;
};

export type SDKPlanUpdate = {
  type: "plan_update";
} & UpdatePlanArgs;

/**
 * Shutdown complete (no payload).
 */
export type SDKShutdownComplete = {
  type: "shutdown_complete";
};
