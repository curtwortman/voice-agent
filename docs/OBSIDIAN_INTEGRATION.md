# Obsidian Integration

Voice Agent automatically transforms your meeting recordings into structured knowledge within your Obsidian vault.

## Workflow

1.  **Recording**: Start a recording session via the Web UI or WebSocket.
2.  **Transcription**: The STT engine (Faster-Whisper) generates a live transcript.
3.  **Completion**: When the session ends, the `api-gateway` sends the full transcript to your local LLM.
4.  **Note Generation**: The LLM processes the text based on a specialized system prompt.
5.  **Vault Write**: The final Markdown file is written directly to your mapped Obsidian vault.

## Configuration

The pipeline depends on an OpenAI-compatible LLM endpoint (defaulting to local **Ollama**):

- `LLM_API_BASE`: e.g., `http://localhost:11434/v1`
- `LLM_MODEL`: e.g., `llama3`

### Vault Mapping
The `docker-compose` files map `./obsidian_vault` on your host to `/app/vault` in the container. Any note generated will appear in that host directory.

## Note Structure

Generated notes follow a PKM-friendly format:

- **YAML Frontmatter**: Includes `tags: [meeting, generated]` and the current date.
- **Summary**: A concise breakdown of key discussion points.
- **Action Items**: A checklist of tasks identified in the transcript.
- **Graph Links**: Automated `[[wikilinks]]` for people, projects, and concepts mentioned, enabling immediate integration into your Obsidian knowledge graph.
- **Full Transcript**: Preserved at the bottom for reference.

## Pro Tip
Point `LLM_API_BASE` to a model with a large context window if you frequently record long meetings (e.g., Llama 3 70B or Mixtral).
