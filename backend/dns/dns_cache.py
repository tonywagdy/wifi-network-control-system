import time

class DNSMemoryCache:
    def __init__(self, default_ttl_sec=300):
        self.default_ttl = default_ttl_sec
        # Schema: {domain: (resolved_ip, expire_timestamp)}
        self._cache = {}

    def get(self, domain):
        """
        Fetches an active record if present and not expired
        """
        cleaned = domain.strip().lower()
        if cleaned in self._cache:
            ip, expire_time = self._cache[cleaned]
            if time.time() < expire_time:
                return ip
            else:
                # Evict expired entry
                del self._cache[cleaned]
        return None

    def set(self, domain, ip, ttl=None):
        """
        Caches a domain resolution
        """
        cleaned = domain.strip().lower()
        ttl_val = ttl if ttl is not None else self.default_ttl
        expire_time = time.time() + ttl_val
        self._cache[cleaned] = (ip, expire_time)

    def prune_expired(self):
        """
        Cleans expired keys
        """
        now = time.time()
        expired_keys = [k for k, (_, expire) in self._cache.items() if now >= expire]
        for k in expired_keys:
            del self._cache[k]

    def clear(self):
        self._cache.clear()

    @property
    def size(self):
        return len(self._cache)
