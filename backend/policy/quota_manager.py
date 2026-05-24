from backend.database.repository import LogAlertRepository, DeviceRepository

class NetworkQuotaManager:
    @staticmethod
    def enforce_traffic_quotas(db):
        """
        Calculates client MB statistics against DB caps, executing throttles or block actions
        """
        from backend.database.models import DBTrafficQuota
        
        quotas = db.query(DBTrafficQuota).filter(DBTrafficQuota.enabled == True).all()
        for quota in quotas:
            # Check associated device
            device = DeviceRepository.get_by_mac(db, quota.mac)
            if not device or device.status == 'offline':
                continue

            # Accumulate consumed MB with simulated download traffic
            # In a real environment, this reading is retrieved from router iptables loops
            quota.consumed_mb += (device.current_download_kbps / 1024.0) * 1.5
            
            # Check limit threshold infraction
            if quota.consumed_mb >= quota.max_mb:
                print(f"[Quota Intercept] MAC {quota.mac} exceeded budget: {quota.consumed_mb:.1f}/{quota.max_mb} MB!")
                
                # Execute predefined infraction actions
                if quota.action == "cutoff" and not device.blocked:
                    device.blocked = True
                    LogAlertRepository.add_alert(
                        db, "high_bandwidth", "critical",
                        f"Quota Budget Exceeded - Blocked",
                        f"Device {device.hostname} ({quota.mac}) consumed {quota.consumed_mb:.1f}MB, exceeding daily {quota.max_mb}MB limit.",
                        quota.mac
                    )
                    LogAlertRepository.add_log(
                        db, "security", "device",
                        f"QUOTA LIMIT: Blocked device {quota.mac} due to budget exhaustion."
                    )
                elif quota.action == "throttle" and device.bandwidth_limit != 64:
                    # Enforce strict speed throttle of 64kbps dialup speeds!
                    device.bandwidth_limit = 64
                    LogAlertRepository.add_alert(
                        db, "high_bandwidth", "medium",
                        f"Quota Limiter Triggered - Throttled",
                        f"Device {device.hostname} throttled to 64 Kbps for exceeding quota budget.",
                        quota.mac
                    )
                    LogAlertRepository.add_log(
                        db, "warning", "device",
                        f"QUOTA LIMIT: Throttled device {quota.mac} to 64 Kbps"
                    )
            else:
                # Quota is below the threshold, but verify that we restore devices if reset was executed
                # Restore original limits if the quota was cleared or reset by admin
                if quota.action == "cutoff" and device.blocked and device.is_blacklisted == False:
                    # Don't auto-restore if manually blacklisted
                    device.blocked = False
                    print(f"[Quota Manager] Restored connectivity for: {quota.mac}")
        db.commit()
