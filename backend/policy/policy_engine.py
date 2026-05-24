from backend.policy.scheduler import PolicyTimeScheduler
from backend.database.repository import (
    DeviceRepository, CustomGroupRepository, ContentGuardPolicyRepository, 
    WebFilterRuleRepository, SystemSettingsRepository
)
from backend.router_adapters.openwrt_adapter import OpenWRTAdapter

class HierarchicalPolicyEngine:
    def __init__(self):
        self.scheduler = PolicyTimeScheduler()
        # Active Router configuration adapter fallback instance
        self.router_adapter = OpenWRTAdapter()

    def compile_and_sync_policies(self, db):
        """
        Gathers database states, resolves group-vs-individual inheritance constraints,
        and pushes compiled QoS shaper configs to physical router nodes.
        """
        print("[Policy Engine] Starting hierarchical rules resolution pass...")

        # 1. Load context states from database repositories
        all_devices = DeviceRepository.get_all(db)
        groups = CustomGroupRepository.get_all(db)
        policy = ContentGuardPolicyRepository.get_policy(db)
        web_rules = WebFilterRuleRepository.get_all(db)
        settings = SystemSettingsRepository.get_settings(db)

        # Map devices to their groups and resolve constraints
        # Schema: {mac_address: group_record}
        device_group_mappings = {}
        for group in groups:
            for mac in group.to_dict().get("deviceMacs", []):
                device_group_mappings[mac] = group

        # 2. Check bedtime windows
        bedtime_active = self.scheduler.is_bedtime_active(policy)
        if bedtime_active:
            print("[Policy Engine Warning] Bedtime locking schedule is ACTIVE currently.")

        # 3. Compile specific device settings
        # Resolve rules following standard hierarchy:
        # WHATEVER -> GROUP RULES -> DEVICE UNIQUE LIMITS -> HOST MANUAL OVERRIDES (WHITELIST/BLACKLIST)
        for dev in all_devices:
            # Skip core router interfaces
            if dev.device_type == 'router':
                continue

            # Default limit inherits system defaults
            resolved_limit = 0  # unlimited
            resolved_blocked = dev.blocked

            # A. Evaluate Group assignments first
            group = device_group_mappings.get(dev.mac)
            if group:
                # E.g., IoT Group limits
                if group.category == 'iot':
                    resolved_limit = 500  # 500kbps standard cap for IoT lines
                elif group.category == 'guest' and settings.bandwidth_cap_kbps > 0:
                    resolved_limit = settings.bandwidth_cap_kbps // 4 # General cap rules
                
                # Bedtime restriction blocks kids group devices entirely
                if group.category == 'kids' and bedtime_active:
                    resolved_blocked = True

            # B. Apply Global Content Guard defaults (Download/Upload cap policies)
            if resolved_limit == 0 and policy.default_download_limit_kbps > 0:
                resolved_limit = policy.default_download_limit_kbps

            # C. Resolve Individual device specific overrides
            if dev.bandwidth_limit > 0:
                # Device-specific speed restriction overrides global group rules
                resolved_limit = dev.bandwidth_limit

            # D. Apply Bedtime Speed Limits
            if bedtime_active and policy.bedtime_enabled:
                if not dev.is_whitelisted and dev.device_type in ['mobile', 'smart-tv', 'game-console']:
                    # Throttles recreational screens during bedtime hours
                    resolved_limit = 128  # Throttled to dial-up values
                    print(f"[Policy Engine] Bedtime restriction enforced on screen device: {dev.hostname} ({dev.mac})")

            # E. Resolve Critical Whitelist Override (Highest priority!)
            if dev.is_whitelisted:
                resolved_blocked = False
                resolved_limit = 0  # Full speed bypass for whitelisted devices (such as administrator laptops!)

            # F. Resolve Manual Blacklist Override
            if dev.is_blacklisted:
                resolved_blocked = True

            # Write compiled resolve values back to local DB cache for UI visualization
            dev.blocked = resolved_blocked
            # Only update limit if not overridden by active fine-grained quotas
            if dev.bandwidth_limit != 64:  # 64 stands for depleted Quota
                dev.bandwidth_limit = resolved_limit

            # 4. Synchronize rules directly to the router hardware via OpenWRT adapter
            try:
                self.router_adapter.write_qos_policy(dev.mac, 0 if resolved_blocked else resolved_limit)
            except Exception as ex:
                print(f"[Policy Router Sync] Pushing QoS rules to router interfaces failed for {dev.mac}: {ex}")

        # 5. Synchronize blacklisted DNS domains to router redirect configs
        for rule in web_rules:
            try:
                if rule.active and rule.action == 'block':
                    self.router_adapter.add_dns_sinkhole(rule.domain)
                else:
                    self.router_adapter.remove_dns_sinkhole(rule.domain)
            except Exception as ex:
                pass

        db.commit()
        print("[Policy Engine] Hierarchical inheritance resolution pass completed.")
        return True
