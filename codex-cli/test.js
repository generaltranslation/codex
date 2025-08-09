import { query } from '@openai/codex'

// Create a simple legal assistant
for await (const message of query({
  prompt: "Hello there"
})) {
    console.log(message)
}