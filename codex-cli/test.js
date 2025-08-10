import { query } from "@generaltranslation/codex";

// Ensure you've set your API key:
// export OPENAI_API_KEY="sk-..."

for await (const event of query({
  prompt: "Explain what src/utils/date.ts does and write 3 unit tests",
})) {
  if (event.msg.type === "agent_message") {
    console.log(event.msg.message);
  }
}