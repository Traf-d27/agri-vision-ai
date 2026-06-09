from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime, timezone
from app.db.session import Base

class ExportReportLog(Base):
    __tablename__ = "export_report_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    user_email = Column(String, nullable=True)
    report_type = Column(String, nullable=False)  # "pdf" or "excel"
    filters_applied = Column(String, nullable=True)  # JSON or query param string
    record_count = Column(Integer, default=0, nullable=False)
