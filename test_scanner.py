import sys
import os
import asyncio
from backend.discovery.network_scanner import NetworkScanner

async def run_once():
    scanner = NetworkScanner()
    scanner._run_scan()

if __name__ == "__main__":
    asyncio.run(run_once())
