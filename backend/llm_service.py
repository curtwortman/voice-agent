import os
import httpx
from typing import Optional

class LLMService:
    def __init__(self):
        self.api_base = os.getenv("LLM_API_BASE", "http://localhost:11434/v1")
        self.api_key = os.getenv("LLM_API_KEY", "ollama")
        self.model = os.getenv("LLM_MODEL", "llama3")

    async def chat_completion(self, system_prompt: str, user_prompt: str) -> Optional[str]:
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{self.api_base}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt}
                        ]
                    }
                )
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
        except Exception as e:
            print(f"LLM Error: {e}")
            return None

class AnalysisService:
    def __init__(self, llm_service: LLMService):
        self.llm = llm_service

    async def analyze(self, transcript: str, task: str) -> str:
        if task == "summarization":
            system_prompt = "You are a helpful assistant. Summarize the following transcript concisely."
        elif task == "sentiment":
            system_prompt = "You are a helpful assistant. Analyze the sentiment of the following transcript (Positive, Negative, or Neutral) and explain why briefly."
        elif task == "intent":
            system_prompt = "You are a helpful assistant. Identify the primary intent or goal of the speaker in the following transcript."
        else:
            system_prompt = "You are a helpful assistant."

        result = await self.llm.chat_completion(system_prompt, f"Transcript:\n\n{transcript}")
        return result or "Analysis failed."
