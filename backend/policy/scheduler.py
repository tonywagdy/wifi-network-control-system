import datetime

class PolicyTimeScheduler:
    @staticmethod
    def is_current_time_in_range(start_str, end_str):
        """
        Determines if the local system time sits inside static HH:MM ranges.
        Compiles and handles cross-midnight loops (e.g., "22:00" to "06:00" next day).
        """
        try:
            now = datetime.datetime.now().time()
            start_parts = [int(x) for x in start_str.strip().split(":")]
            end_parts = [int(x) for x in end_str.strip().split(":")]
            
            start_time = datetime.time(start_parts[0], start_parts[1])
            end_time = datetime.time(end_parts[0], end_parts[1])
            
            if start_time <= end_time:
                # Standard daytime slot (e.g. "09:00" - "17:00")
                return start_time <= now <= end_time
            else:
                # Nighttime crossing midnight slot (e.g. "22:00" - "06:00")
                return now >= start_time or now <= end_time
        except Exception as ex:
            print(f"[Scheduler] Time conversion error matching {start_str}-{end_str}: {ex}")
            return False

    def is_bedtime_active(self, policy_record):
        """
        Utility validating content bedtime flags
        """
        if not policy_record.bedtime_enabled:
            return False
            
        start = policy_record.bedtime_start or "22:00"
        end = policy_record.bedtime_end or "06:00"
        return self.is_current_time_in_range(start, end)
