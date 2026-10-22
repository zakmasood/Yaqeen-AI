"""In-process limit for public proof submissions.

ponytail: one process, one window. Several API workers each count separately.
Put a shared limiter in front of the API before this serves more than one box.
"""

from __future__ import annotations

import time
from collections import defaultdict
from threading import Lock

_LOCK = Lock()
_HITS: dict[str, list[float]] = defaultdict(list)

WINDOW_SECONDS = 60.0
PUBLIC_SUBMISSION_LIMIT = 20


def allow_public_submission(client_host: str) -> bool:
    now = time.monotonic()
    key = client_host or "unknown"
    with _LOCK:
        recent = [stamp for stamp in _HITS[key] if now - stamp < WINDOW_SECONDS]
        if len(recent) >= PUBLIC_SUBMISSION_LIMIT:
            _HITS[key] = recent
            return False
        recent.append(now)
        _HITS[key] = recent
        return True


def reset_public_limits() -> None:
    with _LOCK:
        _HITS.clear()


def is_public_submission(method: str, path: str) -> bool:
    if method.upper() != "POST":
        return False
    if path == "/api/v1/public/submissions":
        return True
    return path.startswith("/api/v1/public/invites/") and path.endswith("/submissions")
