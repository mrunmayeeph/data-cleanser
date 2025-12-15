from datetime import datetime
from server.extensions import db

class BlacklistedToken(db.Model):
    """Model for storing blacklisted JWT tokens"""
    __tablename__ = 'blacklisted_tokens'
    
    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(500), unique=True, nullable=False, index=True)
    blacklisted_on = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    
    def __repr__(self):
        return f'<BlacklistedToken {self.id}>'
    
    @classmethod
    def cleanup_expired(cls):
        """Remove expired tokens from the database"""
        now = datetime.utcnow()
        cls.query.filter(cls.expires_at < now).delete()
        db.session.commit()