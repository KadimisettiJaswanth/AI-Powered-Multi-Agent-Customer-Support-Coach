"""
Configurable LLM provider.

Set LLM_PROVIDER env var to "gemini", "openai", or "mock".
"mock" requires no API key and returns deterministic, structured text so the
full multi-agent pipeline can be exercised end-to-end before any cloud
credentials are configured.

Every provider implements both generate() (full response, used by /chat) and
generate_stream() (yields text chunks, used by /chat/stream for real-time
token streaming to the UI).
"""
import json
import time
import httpx
from typing import Iterator
from tenacity import retry, stop_after_attempt, wait_exponential

from config import settings


class LLMProvider:
    def generate(self, system_prompt: str, user_prompt: str) -> str:
        raise NotImplementedError

    def generate_stream(self, system_prompt: str, user_prompt: str) -> Iterator[str]:
        """Default fallback: no real streaming support, yield the full
        response as a single chunk. Providers that support real token
        streaming override this."""
        yield self.generate(system_prompt, user_prompt)


class MockLLMProvider(LLMProvider):
    """No API key required. Produces a plausible, grounded-looking response
    purely from the prompt so the pipeline is fully testable offline."""

    def _full_text(self, user_prompt: str) -> str:
        if "NO_CONTEXT_FOUND" in user_prompt:
            return "I don't know based on available company documents."
        return (
            "Thanks for reaching out! Based on our documentation: "
            "here is a summary of the relevant policy/procedure that addresses your question. "
            "(This is a MOCK response — set LLM_PROVIDER=gemini or openai and supply an API key "
            "in your .env file to get real generated answers.)"
        )

    def generate(self, system_prompt: str, user_prompt: str) -> str:
        return self._full_text(user_prompt)

    def generate_stream(self, system_prompt: str, user_prompt: str) -> Iterator[str]:
        # Simulates real token streaming by yielding word-by-word with a tiny
        # delay, so the frontend streaming UI can be built/tested with zero
        # API keys before switching to a real provider.
        text = self._full_text(user_prompt)
        words = text.split(" ")
        for i, word in enumerate(words):
            yield word + (" " if i < len(words) - 1 else "")
            time.sleep(0.03)


class GeminiLLMProvider(LLMProvider):
    def __init__(self):
        if not settings.GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY is not set")
        self.api_key = settings.GEMINI_API_KEY
        self.model = settings.GEMINI_MODEL or "gemini-1.5-flash"

    def generate(self, system_prompt: str, user_prompt: str) -> str:
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self.model}:generateContent?key={self.api_key}"
        )
        payload = {
            "system_instruction": {"parts": [{"text": system_prompt}]},
            "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
        }
        try:
            with httpx.Client(timeout=30.0) as client:
                resp = client.post(url, json=payload)
                resp.raise_for_status()
                data = resp.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]
        except Exception:
            # Fallback gracefully to mock response if cloud LLM API fails or returns error
            return MockLLMProvider().generate(system_prompt, user_prompt)


    def generate_stream(self, system_prompt: str, user_prompt: str) -> Iterator[str]:
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self.model}:streamGenerateContent?alt=sse&key={self.api_key}"
        )
        payload = {
            "system_instruction": {"parts": [{"text": system_prompt}]},
            "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
        }
        with httpx.Client(timeout=60.0) as client:
            with client.stream("POST", url, json=payload) as resp:
                resp.raise_for_status()
                for line in resp.iter_lines():
                    if not line or not line.startswith("data:"):
                        continue
                    chunk = line[len("data:"):].strip()
                    if chunk == "[DONE]":
                        break
                    try:
                        data = json.loads(chunk)
                        text = data["candidates"][0]["content"]["parts"][0]["text"]
                        yield text
                    except (json.JSONDecodeError, KeyError, IndexError):
                        continue


class OpenAILLMProvider(LLMProvider):
    def __init__(self):
        if not settings.OPENAI_API_KEY:
            raise RuntimeError("OPENAI_API_KEY is not set")
        self.api_key = settings.OPENAI_API_KEY
        self.model = settings.OPENAI_MODEL

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=8))
    def generate(self, system_prompt: str, user_prompt: str) -> str:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {"Authorization": f"Bearer {self.api_key}"}
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.3,
        }
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
        return data["choices"][0]["message"]["content"]

    def generate_stream(self, system_prompt: str, user_prompt: str) -> Iterator[str]:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {"Authorization": f"Bearer {self.api_key}"}
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.3,
            "stream": True,
        }
        with httpx.Client(timeout=60.0) as client:
            with client.stream("POST", url, json=payload, headers=headers) as resp:
                resp.raise_for_status()
                for line in resp.iter_lines():
                    if not line or not line.startswith("data:"):
                        continue
                    chunk = line[len("data:"):].strip()
                    if chunk == "[DONE]":
                        break
                    try:
                        data = json.loads(chunk)
                        delta = data["choices"][0]["delta"].get("content")
                        if delta:
                            yield delta
                    except (json.JSONDecodeError, KeyError, IndexError):
                        continue


class GroqLLMProvider(LLMProvider):
    """
    Groq: free tier, no credit card required, OpenAI-compatible chat
    completions API running open-source models (Llama, etc.) on custom
    LPU hardware. Get a key at https://console.groq.com/keys.
    """
    def __init__(self):
        if not settings.GROQ_API_KEY:
            raise RuntimeError("GROQ_API_KEY is not set")
        self.api_key = settings.GROQ_API_KEY
        self.model = settings.GROQ_MODEL
        self.base_url = "https://api.groq.com/openai/v1"

    def generate(self, system_prompt: str, user_prompt: str) -> str:
        url = f"{self.base_url}/chat/completions"
        headers = {"Authorization": f"Bearer {self.api_key}"}
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.3,
        }
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
        return data["choices"][0]["message"]["content"]

    
def get_llm_provider() -> LLMProvider:
    provider = settings.LLM_PROVIDER.lower()
    if provider == "gemini":
        return GeminiLLMProvider()
    if provider == "openai":
        return OpenAILLMProvider()
    if provider == "groq":
        return GroqLLMProvider()
    return MockLLMProvider()
