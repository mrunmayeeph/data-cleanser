from datetime import datetime
from sqlalchemy import Column, String, DateTime
from models.user_model import db

class BlocklistedToken(db.Model):
    id = Column(db.Integer, primary_key=True)
    token = Column(db.String(255), unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
