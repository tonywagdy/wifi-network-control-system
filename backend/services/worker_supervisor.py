import asyncio
import time

class WorkerStats:
    def __init__(self, name):
        self.name = name
        self.start_time = 0.0
        self.restarts = 0
        self.status = "stopped"  # stopped, running, crashed
        self.last_heartbeat = 0.0
        self.errors = []

class AsyncWorkerSupervisor:
    def __init__(self):
        # Schema: {worker_name: (coroutine_func, worker_instance, stats)}
        self._workers = {}
        self._tasks = {}

    def register_worker(self, name, start_coro_func):
        """
        Registers a lazy load background worker
        """
        self._workers[name] = {
            "start_func": start_coro_func,
            "instance": None,
            "stats": WorkerStats(name)
        }
        print(f"[Supervisor] Registered background worker: '{name}'")

    async def start_worker(self, name):
        """
        Launches or restarts a single background worker
        """
        if name not in self._workers:
            return False

        worker = self._workers[name]
        stats = worker["stats"]

        # Cancel existing task if running
        if name in self._tasks and not self._tasks[name].done():
            self._tasks[name].cancel()
            try:
                await self._tasks[name]
            except asyncio.CancelledError:
                pass

        stats.start_time = time.time()
        stats.last_heartbeat = time.time()
        stats.status = "running"
        
        # Build tasks and launch
        start_func = worker["start_func"]
        task = asyncio.create_task(self._safely_run_worker(name, start_func))
        self._tasks[name] = task
        print(f"[Supervisor] Successfully launched worker: '{name}'")
        return True

    async def _safely_run_worker(self, name, start_func):
        worker = self._workers[name]
        stats = worker["stats"]
        try:
            # Execute worker main runner loop
            await start_func()
        except asyncio.CancelledError:
            stats.status = "stopped"
            print(f"[Supervisor] Worker '{name}' was cancelled by system request.")
        except Exception as ex:
            stats.status = "crashed"
            stats.errors.append(f"{time.strftime('%H:%M:%S')}: {ex}")
            print(f"[Supervisor Critical] Worker '{name}' crashed unexpectedly: {ex}")
        else:
            stats.status = "stopped"
            print(f"[Supervisor] Worker '{name}' completed run task gracefully.")

    async def stop_worker(self, name):
        """
        Gracefully terminates a running worker
        """
        if name in self._tasks:
            self._tasks[name].cancel()
            if name in self._workers:
                self._workers[name]["stats"].status = "stopped"
            print(f"[Supervisor] Dispatched cancel flag to: '{name}'")
            return True
        return False

    async def start_all(self):
        print("[Supervisor] Initializing and launching all registered worker daemons...")
        for name in self._workers.keys():
            await self.start_worker(name)

    async def stop_all(self):
        print("[Supervisor] Gracefully dismantling and killing all active workers...")
        for name in list(self._tasks.keys()):
            await self.stop_worker(name)

    def get_stats_summary(self):
        """
        Returns stats about active pipelines
        """
        summary = {}
        for name, data in self._workers.items():
            stats = data["stats"]
            summary[name] = {
                "status": stats.status,
                "uptime": int(time.time() - stats.start_time) if stats.status == "running" else 0,
                "restarts": list(self._tasks.keys()).count(name) - 1 if name in self._tasks else 0,
                "last_heartbeat": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(stats.last_heartbeat)),
                "errors": stats.errors
            }
        return summary
