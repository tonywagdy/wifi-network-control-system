import re

class DNSRulesEngine:
    SAFESEARCH_IPS = {
        # forcesafesearch.google.com IP address
        "google.com": "216.239.38.120",
        "forcesafesearch.google.com": "216.239.38.120",
        # safe.bing.com IP address
        "bing.com": "204.79.197.220",
        # restrict.youtube.com IP (Moderate/Strict SafeSearch)
        "youtube.com": "216.239.38.119",
        "m.youtube.com": "216.239.38.119",
        "youtube-ui.l.google.com": "216.239.38.119",
        "ytimg.com": "216.239.38.119",
        # duckduckgo safe search
        "duckduckgo.com": "107.20.240.231"
    }

    ADULT_DOMAINS_SUBSTRINGS = [
        "porn", "xxx", "adult", "sex", "gambling", "casino", "betting", "spyware", "malware"
    ]

    def __init__(self, db_session_provider=None):
        self.db_session_provider = db_session_provider
        self.cached_domains_blacklist = set()
        self.reload_rules()

    def reload_rules(self):
        """
        Loads blacklists and filter rules directly from SQLite active rules
        """
        if not self.db_session_provider:
            return

        session = self.db_session_provider()
        try:
            from backend.database.models import DBWebFilterRule
            rules = session.query(DBWebFilterRule).filter(DBWebFilterRule.active == True).all()
            self.cached_domains_blacklist = {r.domain.strip().lower() for r in rules if r.action == 'block'}
            print(f"[DNS Engine] Active database domains loaded: {len(self.cached_domains_blacklist)} items")
        except Exception as ex:
            print(f"[DNS Engine] SQL rule reload bypass: {ex}")
        finally:
            session.close()

    def check_safe_search_rewrite(self, domain_name):
        """
        Maps a domain name to SafeSearch target IP if applicable
        """
        cleaned = domain_name.strip().lower()
        
        # Check main and safe subdomains
        for target, safe_ip in self.SAFESEARCH_IPS.items():
            if cleaned == target or cleaned.endswith("." + target):
                return safe_ip
        return None

    def evaluate_filtering_action(self, domain_name):
        """
        Evaluates allow/deny access rules for a domain structure.
        Returns ('block' | 'rewrite' | 'allow', mapping_ip)
        """
        raw_clean = domain_name.strip().lower()
        # strip trailing dot if any from native DNS format
        cleaned = raw_clean[:-1] if raw_clean.endswith('.') else raw_clean

        # 1. Custom active domain blacklist loaded from database
        if cleaned in self.cached_domains_blacklist:
            return "block", "0.0.0.0"

        # Check subdomains wildcard matches in blacklist
        for black_domain in self.cached_domains_blacklist:
            if cleaned.endswith("." + black_domain):
                return "block", "0.0.0.0"

        # 2. Heuristic SafeSearch rewrites when content restrictions demand override
        safe_ip = self.check_safe_search_rewrite(cleaned)
        if safe_ip:
            return "rewrite", safe_ip

        # 3. Categorized adult blocking automatic heuristic rules
        for keyword in self.ADULT_DOMAINS_SUBSTRINGS:
            if keyword in cleaned:
                # Blocks malicious/adult domains
                return "block", "0.0.0.0"

        return "allow", None
