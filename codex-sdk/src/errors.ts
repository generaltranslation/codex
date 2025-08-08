export class AgentProcessError extends Error {
  constructor(
    message: string,
    public code?: number,
  ) {
    super(message);
    this.name = "AgentProcessError";
  }
}
export class AgentSpawnError extends Error {
  constructor(
    message: string,
    public cause?: unknown,
  ) {
    super(message);
    this.name = "AgentSpawnError";
  }
}
export class TimeoutError extends Error {
  constructor(
    message: string,
    public timeoutSec?: number,
  ) {
    super(message);
    this.name = "TimeoutError";
  }
}
export class UserAbortError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserAbortError";
  }
}
