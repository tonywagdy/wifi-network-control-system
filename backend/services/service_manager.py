import asyncio
from backend.database.db_session import init_db, get_session
from backend.services.worker_supervisor import AsyncWorkerSupervisor
from backend.services.watchdog import SystemWatchdog
from backend.dns.dns_server import DNSFilteringService
from backend.database.repository import LogAlertRepository
from backend.discovery.network_scanner import NetworkScanner

class MasterServiceManager:
    def __init__(self, dns_port=1053):
        # 1. Initialize databases and migrations
        print("[Service Manager] Verifying local SQLite database clusters structure...")
        init_db()

        self.supervisor = AsyncWorkerSupervisor()
        self.watchdog = SystemWatchdog(self.supervisor, interval_seconds=15)
        
        # 2. Setup standard services
        self.dns_service = DNSFilteringService(bind_port=dns_port)
        self.network_scanner = NetworkScanner()

    async def start_services(self):
        """
        Coordinates full bootstrap sequencing
        """
        print("[Service Manager] Bootstrapping background nodes...")
        db = get_session()
        try:
            LogAlertRepository.add_log(
                db, "info", "system",
                "System Core initialization triggered. Launching all background service blocks."
            )
        except Exception as ex:
            print(f"[Service Manager Setup] Primary DB logging bypassed: {ex}")
        finally:
            db.close()

        # Register server workers
        self.supervisor.register_worker("dns_filtering_server", self.dns_service.start)
        self.supervisor.register_worker("network_scanner", self.network_scanner.start)
        
        # Start all workers
        await self.supervisor.start_all()
        
        # Start watchdog
        await self.watchdog.start()
        print("[Service Manager] System Core bootstrap sequencing complete. System operational.")

    async def stop_services(self):
        """
        Dismantles and cleans active processes
        """
        print("[Service Manager] De-sequencing system cores nicely...")
        await self.watchdog.stop()
        await self.dns_service.stop()
        await self.network_scanner.stop()
        await self.supervisor.stop_all()
        
        db = get_session()
        try:
            LogAlertRepository.add_log(
                db, "info", "system",
                "System core shutting down. All micro-services cancelled gracefully."
            )
        except Exception:
            pass
        finally:
            db.close()
        print("[Service Manager] Shutting down sequence completed.")

if __name__ == "__main__":
    # Test execution
    manager = MasterServiceManager()
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(manager.start_services())
        loop.run_forever()
    except KeyboardInterrupt:
        loop.run_until_complete(manager.stop_services())
