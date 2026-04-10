from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from .database import Base


class Master(Base):
    __tablename__ = "masters"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    model_family = Column(String, nullable=False)   # e.g. "FTWH"
    sub_model = Column(String, nullable=False)       # e.g. "FTWH70" (free-text)
    door_count = Column(Integer, nullable=False, default=2)

    parts = relationship("MasterPart", back_populates="master", cascade="all, delete")


class MasterPart(Base):
    __tablename__ = "master_parts"

    id = Column(Integer, primary_key=True, index=True)
    master_id = Column(Integer, ForeignKey("masters.id"))
    part_name = Column(String, nullable=False)
    job_type = Column(String, nullable=False, default="presence")  # only "presence" now
    image_url = Column(String, nullable=True)

    master = relationship("Master", back_populates="parts")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="operator")  # "admin" or "operator"


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    master_name = Column(String, nullable=False)
    operator = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False)
    parts_data = Column(Text, nullable=False)  # JSON string