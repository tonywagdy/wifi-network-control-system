import asyncio
import socket
import struct
from backend.dns.dns_rules import DNSRulesEngine
from backend.dns.dns_cache import DNSMemoryCache
from backend.database.db_session import get_session
from backend.database.repository import LogAlertRepository

class AsyncDNSServerProtocol(asyncio.DatagramProtocol):
    def __init__(self, rules_engine, cache, upstream_dns="8.8.8.8", upstream_port=53):
        self.rules_engine = rules_engine
        self.cache = cache
        self.upstream_dns = upstream_dns
        self.upstream_port = upstream_port
        self.transport = None

    def connection_made(self, transport):
        self.transport = transport
        print("[DNS Protocol] UDP Port opened successfully.")

    def datagram_received(self, data, addr):
        # Schedule the packet parsing and response asynchronously
        asyncio.create_task(self.handle_dns_packet(data, addr))

    def parse_dns_qname(self, data, offset=12):
        """
        Parses the binary QNAME from a DNS packet at a given offset
        """
        labels = []
        curr = offset
        while True:
            length = data[curr]
            if length == 0:
                curr += 1
                break
            curr += 1
            labels.append(data[curr : curr + length].decode('utf-8', errors='ignore'))
            curr += length
        domain = ".".join(labels)
        # return parsed domain and next binary index
        return domain, curr

    async def handle_dns_packet(self, data, addr):
        if len(data) < 12:
            return  # invalid header size

        # 1. Parse Transaction ID and Flags
        tx_id = data[:2]
        questions_count = struct.unpack(">H", data[4:6])[0]
        if questions_count != 1:
            # We proxy complex configurations directly to upstream
            await self.proxy_to_upstream(data, addr)
            return

        try:
            domain, query_end = self.parse_dns_qname(data, 12)
            qtype, qclass = struct.unpack(">HH", data[query_end : query_end + 4])
        except Exception as parse_ex:
            print(f"[DNS UDP Server] Error parsing domain query: {parse_ex}")
            await self.proxy_to_upstream(data, addr)
            return

        # We only filter/process IPv4 A transactions manually
        if qtype != 1:  # 1 = A (IPv4)
            await self.proxy_to_upstream(data, addr)
            return

        # 2. Check blacklist and safeseach rules
        action, target_ip = self.rules_engine.evaluate_filtering_action(domain)

        # Retrieve client IP
        client_ip = addr[0]

        # Log system audits
        db = get_session()
        try:
            if action == 'block':
                LogAlertRepository.add_log(
                    db, "security", "traffic",
                    f"DNS ACCESS BLOCKED: Client {client_ip} queried blacklisted domain '{domain}'"
                )
                print(f"[DNS Filter] BLOCKED: {domain} queried by client {client_ip}")
            elif action == 'rewrite':
                LogAlertRepository.add_log(
                    db, "warning", "traffic",
                    f"DNS SAFESEARCH ENFORCED: Client {client_ip} query for '{domain}' re-routed to SafeSearch IP '{target_ip}'"
                )
                print(f"[DNS Filter] REWRITE: {domain} re-routed to safe search IP: {target_ip}")
        except Exception as ex:
            print(f"[DNS Filter Error] Log saving bypassed: {ex}")
        finally:
            db.close()

        # Handle Blocked (return 0.0.0.0) or Rewrite (return Target SafeSearch IP)
        if action in ['block', 'rewrite']:
            response = self.build_a_response(tx_id, data[12:query_end+4], target_ip if target_ip else "0.0.0.0")
            self.transport.sendto(response, addr)
            return

        # 3. Consult memory cache
        cached_ip = self.cache.get(domain)
        if cached_ip:
            response = self.build_a_response(tx_id, data[12:query_end+4], cached_ip)
            self.transport.sendto(response, addr)
            return

        # 4. Proxy to internet upstream if not filtered or cached
        await self.proxy_and_cache(data, addr, domain)

    async def proxy_to_upstream(self, data, addr):
        """
        Proxies raw packet bytes upstream and forwards response blindly
        """
        loop = asyncio.get_running_loop()
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.setblocking(False)
            await loop.sock_connect(sock, (self.upstream_dns, self.upstream_port))
            await loop.sock_sendall(sock, data)
            resp = await loop.sock_recv(sock, 1024)
            sock.close()
            self.transport.sendto(resp, addr)
        except Exception as ex:
            print(f"[DNS] Upstream proxy error: {ex}")

    async def proxy_and_cache(self, data, addr, domain):
        """
        Proxies request upstream, parses the IPv4 result, caches it, and returns the response
        """
        loop = asyncio.get_running_loop()
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.setblocking(False)
            await loop.sock_connect(sock, (self.upstream_dns, self.upstream_port))
            await loop.sock_sendall(sock, data)
            resp = await loop.sock_recv(sock, 1024)
            sock.close()

            # Inspect resolved IP from upstream response bytes if possible to cache it
            resolved_ip = self.extract_ip_from_response(resp)
            if resolved_ip:
                self.cache.set(domain, resolved_ip)

            self.transport.sendto(resp, addr)
        except Exception as ex:
            print(f"[DNS cache-proxy] Upstream resolution failed for {domain}: {ex}")
            # Fallback to normal proxy
            await self.proxy_to_upstream(data, addr)

    def extract_ip_from_response(self, data):
        """
        Helper to extracts first IPv4 address from DNS reply
        """
        try:
            if len(data) < 20:
                return None
            ancount = struct.unpack(">H", data[6:8])[0]
            if ancount == 0:
                return None
            
            # Find the end of the query questions
            domain, query_end = self.parse_dns_qname(data, 12)
            # Offset points to start of Answer Records
            ans_start = query_end + 4 
            
            # Read first Answer structure (skipping compressed NAME pointer, TYPE, CLASS, TTL)
            # Offset after compressed name = ans_start + 2
            # Offset after type/class/ttl/rdlength (2+2+4+2) = +10
            # Data bytes start at ans_start + 12
            ip_bytes = data[ans_start + 12 : ans_start + 16]
            if len(ip_bytes) == 4:
                return socket.inet_ntoa(ip_bytes)
        except Exception:
            pass
        return None

    def build_a_response(self, tx_id, question_slice, ip_str):
        """
        Assembles a custom binary IPv4 A DNS reply packet
        """
        # Header - transactional ID + fixed response headers (recursion enabled, standard answer)
        # Questions=1, AnswerRRs=1, AuthorityRRs=0, AddRRs=0
        header = tx_id + struct.pack(">HHHHH", 0x8180, 1, 1, 0, 0)
        
        # Question part (copy QName + QType + QClass)
        question = question_slice
        
        # Answer part - compressed pointer to QName (0xC00C), Type=A (1), Class=IN (1), TTL=60, RDLENGTH=4, RDATA (IP)
        answer_meta = struct.pack(">HHHIH", 0xC00C, 1, 1, 60, 4)
        ip_bytes = socket.inet_aton(ip_str)
        
        return header + question + answer_meta + ip_bytes


class DNSFilteringService:
    def __init__(self, bind_ip="0.0.0.0", bind_port=1053):
        self.bind_ip = bind_ip
        self.bind_port = bind_port
        self.rules = DNSRulesEngine(db_session_provider=get_session)
        self.cache = DNSMemoryCache()
        self.server_task = None
        self.transport = None

    async def start(self):
        print(f"[DNS Daemon] Starting caching asynchronous DNS server on {self.bind_ip}:{self.bind_port}...")
        loop = asyncio.get_running_loop()
        
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEPORT, 1)
            except AttributeError:
                pass
            sock.bind((self.bind_ip, self.bind_port))
            
            transport, protocol = await loop.create_datagram_endpoint(
                lambda: AsyncDNSServerProtocol(self.rules, self.cache),
                sock=sock
            )
            self.transport = transport
            print(f"[DNS Daemon] DNS Filtering Service live, answering requests on port {self.bind_port}.")
        except Exception as bind_err:
            print(f"[DNS Daemon Critical] Port binding to {self.bind_port} failed: {bind_err}")
            print("[DNS Daemon] Please verify that no other service is occupying this port.")

    async def stop(self):
        if self.transport:
            self.transport.close()
            print("[DNS Daemon] DNS Server closed down.")
        if self.server_task:
            self.server_task.cancel()

if __name__ == "__main__":
    # Test boot run
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    service = DNSFilteringService()
    try:
        loop.run_until_complete(service.start())
        loop.run_forever()
    except KeyboardInterrupt:
        loop.run_until_complete(service.stop())
