from abc import ABC, abstractmethod


class BaseAgent(ABC):
    """Every agent implements run() and is independently testable/swappable."""

    name: str = "base_agent"

    @abstractmethod
    def run(self, **kwargs):
        ...
