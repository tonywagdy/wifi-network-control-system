import sys
from backend.router_adapters.openwrt_adapter import OpenWRTAdapter

adapter = OpenWRTAdapter("127.0.0.1", "root", "password")
print("Authenticating OpenWRT...")
success = adapter.login()
print(f"Auth Success: {success}")
if success:
    print("Leases:", adapter.get_dhcp_leases())

from backend.router_adapters.mikrotik_adapter import MikroTikAdapter
adapter2 = MikroTikAdapter("127.0.0.1", "root", "password")
print("\nTesting MikroTik API:")
from urllib.error import URLError
try:
    print("Mikrotik Devices:", adapter2.get_connected_devices())
    print("MikroTik QoS:", adapter2.write_qos_policy("bc:d1:d3:dc:f6:7e", 5000))
    print("MikroTik DNS:", adapter2.add_dns_rule("bad-domain.com", "127.0.0.1"))
except Exception as e:
    print(f"Mikrotik Error: {e}")
    
from backend.router_adapters.pihole_adapter import PiholeAdapter
pihole = PiholeAdapter("127.0.0.1", "secret")
print("\nPi-hole Stats:", pihole.query_status())
print("Pi-hole Sync:", pihole.add_domain_rule("bad-domain.com", "black"))

print("\n--- Testing Database Writes ---")
from backend.database.db_session import get_session
from backend.database.repository import DeviceRepository
db = get_session()
devices = DeviceRepository.get_all(db)
print("Persisted Devices Count:", len(devices))
if devices:
    d = devices[0]
    print(f"Device 0: {d.mac} | {d.ip} | {d.hostname} | Status: {d.status}")

from backend.database.models import DBNetworkStats
stats = db.query(DBNetworkStats).first()
if stats:
    print(f"Telemetry Persistence: Down={stats.total_downloaded_mb}MB Up={stats.total_uploaded_mb}MB")

