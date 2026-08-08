import time
import json
from typing import Any, Optional, Dict
import logging

logger = logging.getLogger(__name__)

_cache: Dict[str, Dict[str, Any]] = {}
DEFAULT_TTL_SECONDS = 600  # 10 minutes


def make_cache_key(prefix: str, params: Dict[str, Any]) -> str:
    """Construct a deterministic string key from a prefix and dictionary parameters."""
    try:
        # Filter out None values and sort keys
        cleaned_params = {k: v for k, v in sorted(params.items()) if v is not None}
        param_str = json.dumps(cleaned_params, sort_keys=True)
        return f"{prefix}:{param_str}"
    except Exception:
        return f"{prefix}:{str(params)}"


def get_cache(key: str) -> Optional[Any]:
    """Retrieve item from in-memory cache if not expired."""
    entry = _cache.get(key)
    if not entry:
        return None
    if time.time() > entry["expires_at"]:
        _cache.pop(key, None)
        return None
    return entry["data"]


def set_cache(key: str, data: Any, ttl_seconds: int = DEFAULT_TTL_SECONDS):
    """Store item in in-memory cache with specified TTL."""
    _cache[key] = {
        "data": data,
        "expires_at": time.time() + ttl_seconds
    }


def clear_cache():
    """Clear all cached entries. Call when underlying database data mutates."""
    global _cache
    _cache.clear()
    logger.info("Analytics and ML in-memory cache cleared.")
