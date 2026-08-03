from agents.base import BaseAgent

try:
    from langdetect import detect, DetectorFactory, LangDetectException
    DetectorFactory.seed = 0  # deterministic results
    _HAS_LANGDETECT = True
except ImportError:  # pragma: no cover - only hit if the optional dep isn't installed
    _HAS_LANGDETECT = False

_LANGUAGE_NAMES = {
    "en": "English", "es": "Spanish", "fr": "French", "de": "German",
    "pt": "Portuguese", "it": "Italian", "nl": "Dutch", "hi": "Hindi",
    "zh-cn": "Chinese", "ja": "Japanese", "ko": "Korean", "ar": "Arabic",
    "ru": "Russian",
}


class LanguageAgent(BaseAgent):
    """
    Language Detection agent (supports the spec's Multi-language Support
    feature). Detects the customer's question language so the UI can flag it
    and, in a future pass, so the response agent can be instructed to reply
    in the same language.
    """
    name = "language_agent"

    def run(self, text: str) -> dict:
        if not _HAS_LANGDETECT or len(text.strip()) < 3:
            return {"language_code": "en", "language_name": "English", "detected": False}
        try:
            code = detect(text)
        except LangDetectException:
            return {"language_code": "en", "language_name": "English", "detected": False}
        return {
            "language_code": code,
            "language_name": _LANGUAGE_NAMES.get(code, code.upper()),
            "detected": True,
        }
