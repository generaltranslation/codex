import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function resolveCodexBinary(): string {
  // __dirname equivalent in ESM
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const { platform, arch } = process;

  let targetTriple = null;
  switch (platform) {
    case "linux":
    case "android":
      switch (arch) {
        case "x64":
          targetTriple = "x86_64-unknown-linux-musl";
          break;
        case "arm64":
          targetTriple = "aarch64-unknown-linux-musl";
          break;
        default:
          break;
      }
      break;
    case "darwin":
      switch (arch) {
        case "x64":
          targetTriple = "x86_64-apple-darwin";
          break;
        case "arm64":
          targetTriple = "aarch64-apple-darwin";
          break;
        default:
          break;
      }
      break;
    case "win32":
      switch (arch) {
        case "x64":
          targetTriple = "x86_64-pc-windows-msvc.exe";
          break;
        case "arm64":
        // We do not build this today, fall through...
        default:
          break;
      }
      break;
    default:
      break;
  }

  if (!targetTriple) {
    throw new Error(`Unsupported platform: ${platform} (${arch})`);
  }

  const binaryPath = path.join(__dirname, "..", "bin", `codex-${targetTriple}`);
  return binaryPath;
}

export function ensureExecutable(p: string) {
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
