import asyncio
import socket
import hashlib
import base64
import json
import threading
import sys
import os

# Setup path imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from backend.database.db_session import get_session
from backend.database.models import DBNetworkStats, DBDevice

class PythonWebSocketManager:
    """
    Zero-dependency, RFC-6455 compliant WebSocket broadcast server.
    Binds to port 5001 and pushes live telemetry data down to connected subscribers.
    """
    def __init__(self, host="0.0.0.0", port=5001):
        self.host = host
        self.port = port
        self.clients = set()
        self.clients_lock = threading.Lock()
        self.running = False

    def start_server(self):
        self.running = True
        loop = asyncio.new_event_loop()
        t = threading.Thread(target=self._run_loop, args=(loop,), daemon=True)
        t.start()
        print(f"[WebSocket Core] Server initialized on ws://{self.host}:{self.port}")

    def _run_loop(self, loop):
        asyncio.set_event_loop(loop)
        loop.run_until_complete(self._listen())

    async def _listen(self):
        server = await asyncio.start_server(self._handle_client, self.host, self.port)
        async with server:
            while self.running:
                await asyncio.sleep(1)

    async def _handle_client(self, reader, writer):
        # 1. Complete WS RFC-6455 handshake
        headers = {}
        try:
            while True:
                line = await reader.readline()
                if not line or line == b'\r\n':
                    break
                decoded_line = line.decode('utf-8').strip()
                if ":" in decoded_line:
                    k, v = decoded_line.split(":", 1)
                    headers[k.strip().lower()] = v.strip()

            sec_key = headers.get("sec-websocket-key")
            if not sec_key:
                writer.close()
                await writer.wait_closed()
                return

            # Magic WS GUID
            ws_guid = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
            accept_hash = hashlib.sha1((sec_key + ws_guid).encode('utf-8')).digest()
            accept_b64 = base64.b64encode(accept_hash).decode('utf-8')

            handshake_response = (
                "HTTP/1.1 101 Switching Protocols\r\n"
                "Upgrade: websocket\r\n"
                "Connection: Upgrade\r\n"
                f"Sec-WebSocket-Accept: {accept_b64}\r\n\r\n"
            )
            writer.write(handshake_response.encode('utf-8'))
            await writer.drain()

            with self.clients_lock:
                self.clients.add(writer)
                print(f"[WebSocket Core] Secure Handshake established. Active Subscribers: {len(self.clients)}")

            # 2. Keep reader open to detect disconnection
            while True:
                # Read dummy bytes to check if connection drops
                data = await reader.read(1024)
                if not data:
                    break
        except Exception:
            pass
        finally:
            with self.clients_lock:
                self.clients.discard(writer)
                print(f"[WebSocket Core] Client subscriber disconnected. Active Subscribers: {len(self.clients)}")
            try:
                writer.close()
                await writer.wait_closed()
            except Exception:
                pass

    def broadcast_telemetry(self, payload: dict):
        """
        Encapsulates payload dict into a valid RFC-6455 text frame and broadcasts it to all clients.
        """
        payload_bytes = json.dumps(payload).encode('utf-8')
        length = len(payload_bytes)

        # Build Frame Header
        # Opcode 0x81 (FIN bit on, Text frame)
        frame = bytearray([0x81])
        if length <= 125:
            frame.append(length)
        elif length <= 65535:
            frame.append(126)
            frame.extend(struct_pack_u16(length))
        else:
            frame.append(127)
            frame.extend(struct_pack_u64(length))
        frame.extend(payload_bytes)

        with self.clients_lock:
            disconnected = []
            for client in self.clients:
                try:
                    client.write(frame)
                    # asyncio drain is handled dynamically inside standard event loop
                except Exception:
                    disconnected.append(client)
            
            for d in disconnected:
                self.clients.discard(d)

def struct_pack_u16(val):
    return bytearray([(val >> 8) & 0xFF, val & 0xFF])

def struct_pack_u64(val):
    return bytearray([
        (val >> 56) & 0xFF, (val >> 48) & 0xFF, (val >> 40) & 0xFF, (val >> 32) & 0xFF,
        (val >> 24) & 0xFF, (val >> 16) & 0xFF, (val >> 8) & 0xFF, val & 0xFF
    ])

# Global Singleton Manager instance
ws_broadcaster = PythonWebSocketManager()
