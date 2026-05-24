import datetime
# Pure python DB repository compatibility layer
class Session:
    pass
from backend.database.models import (
    DBDevice, DBNetworkStats, DBSystemLog, DBNetworkAlert, 
    DBSystemSettings, DBWebFilterRule, DBContentGuardPolicy, 
    DBCustomGroup, DBTrafficQuota, DBPacketTelemetry
)

class DeviceRepository:
    @staticmethod
    def get_all(db: Session):
        return db.query(DBDevice).all()

    @staticmethod
    def get_by_mac(db: Session, mac: str):
        return db.query(DBDevice).filter(DBDevice.mac == mac).first()

    @staticmethod
    def save(db: Session, dev_model: DBDevice):
        db.add(dev_model)
        db.commit()
        db.refresh(dev_model)
        return dev_model

    @staticmethod
    def update_status(db: Session, mac: str, status: str):
        dev = DeviceRepository.get_by_mac(db, mac)
        if dev:
            dev.status = status
            dev.last_seen = datetime.datetime.utcnow()
            db.commit()
        return dev


class WebFilterRuleRepository:
    @staticmethod
    def get_all(db: Session):
        return db.query(DBWebFilterRule).all()

    @staticmethod
    def get_active_blacklist(db: Session):
        return db.query(DBWebFilterRule).filter(
            DBWebFilterRule.active == True, 
            DBWebFilterRule.action == 'block'
        ).all()

    @staticmethod
    def get_by_id(db: Session, r_id: str):
        return db.query(DBWebFilterRule).filter(DBWebFilterRule.id == r_id).first()

    @staticmethod
    def delete(db: Session, r_id: str):
        rule = WebFilterRuleRepository.get_by_id(db, r_id)
        if rule:
            db.delete(rule)
            db.commit()
            return True
        return False


class SystemSettingsRepository:
    @staticmethod
    def get_settings(db: Session):
        settings = db.query(DBSystemSettings).first()
        if not settings:
            settings = DBSystemSettings()
            db.add(settings)
            db.commit()
            db.refresh(settings)
        return settings

    @staticmethod
    def update_settings(db: Session, data: dict):
        settings = SystemSettingsRepository.get_settings(db)
        for key, value in data.items():
            if hasattr(settings, key):
                setattr(settings, key, value)
        db.commit()
        return settings


class ContentGuardPolicyRepository:
    @staticmethod
    def get_policy(db: Session):
        policy = db.query(DBContentGuardPolicy).first()
        if not policy:
            policy = DBContentGuardPolicy()
            db.add(policy)
            db.commit()
            db.refresh(policy)
        return policy

    @staticmethod
    def update_policy(db: Session, data: dict):
        policy = ContentGuardPolicyRepository.get_policy(db)
        for key, value in data.items():
            if hasattr(policy, key):
                setattr(policy, key, value)
        db.commit()
        return policy


class CustomGroupRepository:
    @staticmethod
    def get_all(db: Session):
        return db.query(DBCustomGroup).all()

    @staticmethod
    def get_by_id(db: Session, g_id: str):
        return db.query(DBCustomGroup).filter(DBCustomGroup.id == g_id).first()

    @staticmethod
    def save(db: Session, group_model: DBCustomGroup):
        db.add(group_model)
        db.commit()
        db.refresh(group_model)
        return group_model

    @staticmethod
    def delete(db: Session, g_id: str):
        g = CustomGroupRepository.get_by_id(db, g_id)
        if g:
            db.delete(g)
            db.commit()
            return True
        return False


class TrafficQuotaRepository:
    @staticmethod
    def get_all(db: Session):
        return db.query(DBTrafficQuota).all()

    @staticmethod
    def get_by_mac(db: Session, mac: str):
        return db.query(DBTrafficQuota).filter(DBTrafficQuota.mac == mac).first()

    @staticmethod
    def save(db: Session, quota_model: DBTrafficQuota):
        db.add(quota_model)
        db.commit()
        db.refresh(quota_model)
        return quota_model


class LogAlertRepository:
    @staticmethod
    def add_log(db: Session, level: str, category: str, message: str):
        import uuid
        log = DBSystemLog(
            id=f"log_{uuid.uuid4().hex[:12]}",
            level=level,
            category=category,
            message=message,
            timestamp=datetime.datetime.utcnow()
        )
        db.add(log)
        db.commit()
        return log

    @staticmethod
    def get_all_logs(db: Session, limit: int = 100):
        return db.query(DBSystemLog).order_by(DBSystemLog.timestamp.desc()).limit(limit).all()

    @staticmethod
    def add_alert(db: Session, alert_type: str, severity: str, title: str, message: str, dev_mac: str = None):
        import uuid
        alert = DBNetworkAlert(
            id=f"alert_{uuid.uuid4().hex[:12]}",
            type=alert_type,
            severity=severity,
            title=title,
            message=message,
            device_mac=dev_mac,
            read=False,
            timestamp=datetime.datetime.utcnow()
        )
        db.add(alert)
        db.commit()
        return alert

    @staticmethod
    def get_all_alerts(db: Session):
        return db.query(DBNetworkAlert).order_by(DBNetworkAlert.timestamp.desc()).all()

    @staticmethod
    def mark_all_read(db: Session):
        db.query(DBNetworkAlert).update({DBNetworkAlert.read: True})
        db.commit()
        return True
