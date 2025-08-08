import { promises as fs } from "node:fs";

async function parseStdout(): Promise<void> {
  const input = await new Promise<string>((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data.trim()));
    process.stdin.on("error", reject);
  });

  if (!input) {
    process.exitCode = 1;
    return;
  }

  try {
    JSON.parse(input);
  } catch {
    process.exitCode = 1;
    return;
  }

  try {
    await fs.writeFile("/dev/stdout", input + "\n", { encoding: "utf8" });
  } catch {
    process.exitCode = 1;
  }
}

parseStdout().catch(() => {
  process.exitCode = 1;
});
