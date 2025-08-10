import { SDKOutputEvent, Options } from "./types.js";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

export { SDKOutputEvent, Options };

export class AbortError extends Error {}

class AsyncQueue<T> implements AsyncIterable<T> {
  private q: Array<T | Error | symbol> = [];
  private pending?: (value: IteratorResult<T>) => void;
  private readonly DONE = Symbol("DONE");

  push(value: T) {
    if (this.pending) {
      const resolve = this.pending;
      this.pending = undefined;
      resolve({ done: false, value });
      return;
    }
    this.q.push(value);
  }
  error(err: Error) {
    if (this.pending) {
      const pending = this.pending;
      this.pending = undefined;
      // propagate error via throw in next tick
      setImmediate(() => {
        throw err;
      });
      // also mark done so consumers stop
      pending({ done: true, value: undefined });
      return;
    }
    this.q.push(err);
  }
  end() {
    if (this.pending) {
      const resolve = this.pending;
      this.pending = undefined;
      resolve({ done: true, value: undefined });
      return;
    }
    this.q.push(this.DONE);
  }
  [Symbol.asyncIterator]() {
    return this.iterator();
  }
  private async *iterator(): AsyncIterator<T> {
    while (true) {
      if (this.q.length === 0) {
        // eslint-disable-next-line no-await-in-loop
        const next = await new Promise<IteratorResult<T>>((resolve) => {
          this.pending = resolve;
        });
        if (next.done) {
          return;
        }
        yield next.value as T;
        continue;
      }
      const item = this.q.shift()!;
      if (item === this.DONE) {
        return;
      }
      if (item instanceof Error) {
        throw item;
      }
      yield item as T;
    }
  }
}

function resolveCodexBinary(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const { platform, arch } = process;

  let triple: string | null = null;
  if (platform === "darwin")
    triple = arch === "arm64" ? "aarch64-apple-darwin" : "x86_64-apple-darwin";
  else if (platform === "linux" || platform === "android")
    triple =
      arch === "arm64"
        ? "aarch64-unknown-linux-musl"
        : "x86_64-unknown-linux-musl";
  else if (platform === "win32") triple = "x86_64-pc-windows-msvc.exe";

  if (triple) {
    const bin = path.join(__dirname, "..", "bin", `codex-${triple}`);
    if (fs.existsSync(bin)) return bin;
  }
  return "codex"; // fall back to PATH if needed
}

function ensureExecutable(p: string) {
  try {
    fs.accessSync(p, fs.constants.X_OK);
  } catch {
    try {
      fs.chmodSync(p, 0o755);
    } catch (e) {
      throw new Error(
        `Codex binary not executable: ${p}. Try: chmod +x "${p}"`,
      );
    }
  }
}

export async function* query({
  prompt,
  abortController = new AbortController(),
  options = {},
}: {
  prompt: string;
  abortController?: AbortController;
  options?: Options;
}): AsyncGenerator<SDKOutputEvent> {
  // Build args
  const args: Array<string> = ["exec", prompt, "--json"];
  if (options.config) {
    args.push("--config", options.config);
  }
  if (options.image) {
    args.push("--image", options.image);
  }
  if (options.cd) {
    args.push("--cd", options.cd);
  }
  if (options.sandbox) {
    args.push("--sandbox", options.sandbox);
  }
  if (options.profile) {
    args.push("--profile", options.profile);
  }
  if (options.fullAuto) {
    args.push("--full-auto");
  }
  if (options.dangerouslyBypassApprovalsAndSandbox) {
    args.push("--dangerously-bypass-approvals-and-sandbox");
  }
  if (options.skipGitRepoCheck) {
    args.push("--skip-git-repo-check");
  }
  if (options.color) {
    args.push("--color", options.color);
  }
  if (options.outputLastMessage) {
    args.push("--output-last-message", options.outputLastMessage);
  }
  if (options.model) {
    args.push("--model", options.model);
  }

  const cmd = resolveCodexBinary();
  ensureExecutable(cmd);
  const child = spawn(cmd, args, {
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
    signal: abortController.signal,
  });

  const queue = new AsyncQueue<SDKOutputEvent>();
  const stderrLog = (data: Buffer) => {
    debugLog(data.toString().trim());
  };
  child.stderr?.on("data", stderrLog);

  // Parse line-delimited JSON from stdout
  let buffer = "";
  child.stdout?.on("data", (data: Buffer) => {
    buffer += data.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }
      try {
        debugLog(line);
        const obj = JSON.parse(line);
        queue.push(obj);
      } catch (err) {
        debugLog(String(err));
      }
    }
  });

  const closePromise = new Promise<void>((resolve, reject) => {
    child.on("close", (code: number | null) => {
      cleanup();
      if (abortController.signal.aborted) {
        reject(new AbortError("Codex process aborted by user"));
      }
      if (code !== 0) {
        reject(new Error(`Codex process exited with code ${code}`));
      } else {
        resolve();
      }
    });

    child.on("error", (error) => {
      cleanup();
      if (abortController.signal.aborted) {
        reject(new AbortError("Codex process aborted by user"));
      } else {
        reject(new Error(`Codex process exited with error: ${error.message}`));
      }
    });
  });

  const cleanup = () => {
    child.stderr?.off("data", stderrLog);
    // ensure trailing buffer is processed if it's valid JSON
    if (buffer.trim()) {
      try {
        const obj = JSON.parse(buffer);
        queue.push(obj);
      } catch {
        // ignore partial
      }
    }
  };

  // Drain stream while process runs; propagate completion/error to the iterator
  try {
    // Yield messages as they arrive
    const forward = (async () => {
      // wait for process termination to know when to end/throw
      await closePromise;
      queue.end();
    })().catch((err) => {
      queue.error(err);
      queue.end();
    });

    for await (const msg of queue) {
      yield msg;
    }
    await forward; // surface any late errors
  } finally {
    // no-op; listeners already torn down in close handler
  }
}

function debugLog(message: string) {
  if (process.env.DEBUG) {
    // eslint-disable-next-line no-console
    console.log(message);
  }
}
