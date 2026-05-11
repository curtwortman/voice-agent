import os
import httpx
from datetime import datetime

class ObsidianService:
    def __init__(self):
        self.api_base = os.getenv("LLM_API_BASE", "http://localhost:11434/v1")
        self.api_key = os.getenv("LLM_API_KEY", "ollama")
        self.model = os.getenv("LLM_MODEL", "llama3")
        self.vault_dir = os.getenv("OBSIDIAN_VAULT_DIR", "/app/vault")
        os.makedirs(self.vault_dir, exist_ok=True)
        
    def generate_note(self, transcript: str):
        if not transcript.strip():
            return
            
        current_date = datetime.now().strftime("%Y-%m-%d")
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        filename = os.path.join(self.vault_dir, f"Meeting_{timestamp}.md")
        
        system_prompt = f"""You are an intelligent meeting assistant. Create an Obsidian-compliant meeting note based on the provided transcript.
Format strictly using the following structure. Do not add any text before or after this structure:

---
tags:
  - meeting
  - generated
date: {current_date}
---
# Meeting Summary
[Write a concise summary of the key discussion points]

# Action Items
- [ ] [Extract action items from the transcript]

# Graph Links
[[Link 1]], [[Link 2]]
(Identify key people, projects, concepts, and tools mentioned and format them as Obsidian wikilinks)

# Transcript
(Include the full transcript below, preserving the original text)
"""
        try:
            print(f"Generating Obsidian note for transcript length {len(transcript)}...")
            with httpx.Client(timeout=120.0) as client:
                response = client.post(
                    f"{self.api_base}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": f"Please process this transcript:\n\n{transcript}"}
                        ]
                    }
                )
                response.raise_for_status()
                data = response.json()
                note_content = data["choices"][0]["message"]["content"]
                
                # Fallback if LLM didn't include the transcript properly
                if "# Transcript" not in note_content:
                    note_content += f"\n\n# Transcript\n{transcript}"
                    
                with open(filename, "w") as f:
                    f.write(note_content)
                print(f"Successfully saved Obsidian note to {filename}")
        except Exception as e:
            print(f"Error generating Obsidian note via LLM: {e}")
            # Fallback to saving raw transcript
            fallback_content = f"---\ntags:\n  - meeting\n  - fallback\ndate: {current_date}\n---\n# Meeting Summary\n(LLM Error: {e})\n\n# Transcript\n{transcript}"
            with open(filename, "w") as f:
                f.write(fallback_content)
            print(f"Saved fallback raw transcript to {filename}")
