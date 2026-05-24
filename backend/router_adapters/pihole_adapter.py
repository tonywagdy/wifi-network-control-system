import json
import urllib.request
import urllib.parse
import sqlite3
import os

class PiholeAdapter:
    def __init__(self, target_ip="192.168.1.5", api_token=""):
        self.target_ip = target_ip
        self.api_token = api_token
        self.base_url = f"http://{target_ip}/admin/api.php"
        # Pi-hole local SQLite Gravity Database path
        self.gravity_db_path = "/etc/pihole/gravity.db"

    def query_status(self):
        """
        Polls Pi-Hole status and active domains database count
        """
        url = f"{self.base_url}?status&auth={self.api_token}"
        try:
            req = urllib.request.Request(url, method="GET")
            with urllib.request.urlopen(req, timeout=3) as res:
                return json.loads(res.read().decode('utf-8'))
        except Exception as ex:
            print(f"[Pi-hole] Offline status fetch, returning fallback: {ex}")
            
        return {
            "status": "disabled",
            "domains_being_blocked": 0,
            "dns_queries_today": 0,
            "ads_blocked_today": 0,
            "ads_percentage_today": 0.0
        }

    def add_domain_rule(self, domain, list_type="black"):
        """
        Interacts with the actual gravity.db domain list table:
        INSERT INTO domainlist (type, domain, enabled, comment) VALUES (?, ?, 1, ?)
        types: 0 = whitelist, 1 = blacklist, 2 = regex whitelist, 3 = regex blacklist
        """
        type_code = 1 if list_type == "black" else 0
        
        # 1. Execute via SQLite if local gravity db exists
        if os.path.exists(self.gravity_db_path):
            try:
                conn = sqlite3.connect(self.gravity_db_path)
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT OR IGNORE INTO domainlist (type, domain, enabled, comment) VALUES (?, ?, 1, 'NetControl-Auto')",
                    (type_code, domain)
                )
                conn.commit()
                conn.close()
                print(f"[Pi-hole DB] Inserted domain rule into gravity.db list: {domain} (type={list_type})")
                return {"success": True, "method": "local_sqlite"}
            except Exception as dberr:
                print(f"[Pi-hole DB] SQLite insertion failed: {dberr}")

        # 2. Remote API Web fallback
        url = f"{self.base_url}?add={domain}&list={list_type}&auth={self.api_token}"
        try:
            req = urllib.request.Request(url, method="POST")
            with urllib.request.urlopen(req, timeout=3) as res:
                response = res.read().decode('utf-8')
                print(f"[Pi-hole API] Added domain rule: {domain} -> {response}")
                return {"success": True, "method": "http_api", "response": response}
        except Exception as ex:
            print(f"[Pi-hole API] Add request failed: {ex}")
            return {"success": False, "error": str(ex), "method": "api_failed"}

    def remove_domain_rule(self, domain, list_type="black"):
        """
        Removes rule from local gravity.db domainlist
        """
        type_code = 1 if list_type == "black" else 0
        if os.path.exists(self.gravity_db_path):
            try:
                conn = sqlite3.connect(self.gravity_db_path)
                cursor = conn.cursor()
                cursor.execute("DELETE FROM domainlist WHERE type = ? AND domain = ?", (type_code, domain))
                conn.commit()
                conn.close()
                print(f"[Pi-hole DB] Removed domain {domain} from gravity.db list")
                return {"success": True, "method": "local_sqlite"}
            except Exception as dberr:
                print(f"[Pi-hole DB] SQLite delete failed: {dberr}")

        return {"success": False, "error": "file_not_found_or_db_error"}

    def get_query_logs(self, limit=50):
        """
        Fetches live query traces from Pi-Hole backend FTL: api.php?getAllQueries
        """
        url = f"{self.base_url}?getAllQueries={limit}&auth={self.api_token}"
        try:
            req = urllib.request.Request(url, method="GET")
            with urllib.request.urlopen(req, timeout=3) as res:
                raw_data = json.loads(res.read().decode('utf-8'))
                queries = []
                # Raw pi-hole logs are arrays of lists
                for item in raw_data.get("data", []):
                    queries.append({
                        "timestamp": item[0],
                        "type": item[1],
                        "domain": item[2],
                        "client": item[3],
                        "status": item[4],
                        "reply_type": item[5]
                    })
                return queries
        except Exception:
            pass
            
        return []
