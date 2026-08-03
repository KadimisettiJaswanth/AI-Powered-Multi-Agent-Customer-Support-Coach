"""
Lightweight in-memory rate limiter.

This is intentionally dependency-free (sliding window counters in a dict)
so it works with zero setup. It is per-process, in-memory state -- fine for
a single backend instance or local dev, but NOT correct across multiple
replicas in production. For real production deployment behind a load
balancer, replace this with a Redis-backed limiter (e.g. slowapi + redis,
or an API-gateway-level limit).
"""
import time
from collections import defaultdict
from threading import Lock

from fastapi import Request, HTTPException, status

_buckets: dict[str, list[float]] = defaultdict(list)
_lock = Lock()


def _client_key(request: Request, scope: str) -> str:
    # Prefer the authenticated user if we can see the bearer token prefix,
    # otherwise fall back to client IP. Good enough to stop abuse/brute force
    # without needing to fully decode the JWT here.
    ip = request.client.host if request.client else "unknown"
    return f"{scope}:{ip}"


def rate_limit(scope: str, max_requests: int, window_seconds: int):
    """
    Dependency factory. Usage:
        Depends(rate_limit("login", max_requests=10, window_seconds=60))
    """
    def checker(request: Request):
        key = _client_key(request, scope)
        now = time.time()
        with _lock:
            bucket = _buckets[key]
            # drop timestamps outside the window
            cutoff = now - window_seconds
            while bucket and bucket[0] < cutoff:
                bucket.pop(0)
            if len(bucket) >= max_requests:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Too many requests to '{scope}'. Try again in a moment.",
                )
            bucket.append(now)
    return checker
