import asyncio
import time
from backend.database.db_session import get_session
from backend.database.repository import LogAlertRepository

class SystemWatchdog:
    def __init__(self, supervisor, interval_seconds=10):
        self.supervisor = supervisor
        self.interval = interval_seconds
        self.is_running = False
        self._watchdog_task = None

    async def start(self):
        self.is_running = True
        self._watchdog_task = asyncio.create_task(self._maintain_health_loop())
        print(f"[Watchdog] Self-healing supervisor loop launched (interval: {self.interval}s).")

    async def stop(self):
        self.is_running = False
        if self._watchdog_task:
            self._watchdog_task.cancel()
            try:
                await self._watchdog_task
            except asyncio.CancelledError:
                pass
        print("[Watchdog] Self-healing watchdog shut down.")

    async def _maintain_health_loop(self):
        while self.is_running:
            await asyncio.sleep(self.interval)
            try:
                await self._perform_health_checks()
            except Exception as ex:
                print(f"[Watchdog Error] System audit cycle failed: {ex}")

    async def _perform_health_checks(self):
        """
        Scans all supervisor nodes, recovers stopped or crashed background programs
        """
        stats = self.supervisor.get_stats_summary()
        db = get_session()

        try:
            for worker_name, summary in stats.items():
                status = summary["status"]
                
                # Check for crashed or stopped processes that should be running
                if status in ["crashed", "stopped"]:
                    print(f"[Watchdog Recover] Crash found in worker '{worker_name}'! Initiating automatic recovery...")
                    
                    # Log recovery incident info to database
                    LogAlertRepository.add_alert(
                        db, "disconnect", "high",
                        f"Microservice Crash Detected: {worker_name}",
                        f"Watchdog auto-recovery initiated. Restarting worker thread."
                    )
                    LogAlertRepository.add_log(
                        db, "warning", "system",
                        f"WATCHDOG: Worker '{worker_name}' was found in invalid state '{status}'. Triggering soft reboot."
                    )
                    
                    # Record restart request
                    await self.supervisor.start_worker(worker_name)
                    self.supervisor._workers[worker_name]["stats"].restarts += 1
                else:
                    # Healthy, log heartbeat tick
                    self.supervisor._workers[worker_name]["stats"].last_heartbeat = time.time()
                    
        finally:
            db.close()
