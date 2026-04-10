from pydantic import BaseModel, Field
from typing import List, Optional


class MasterPartCreate(BaseModel):
    part_name: str
    job_type: str = "presence"         # only "presence" supported now
    image_url: Optional[str] = None


class MasterCreate(BaseModel):
    name: str = Field(..., min_length=1)
    model_family: str = Field(..., min_length=1)   # e.g. "FTWH"
    sub_model: str = Field(..., min_length=1)       # e.g. "FTWH70" (free-text)
    door_count: int = Field(default=2, ge=1, le=6)
    parts: List[MasterPartCreate]


class UserLogin(BaseModel):
    username: str
    password: str


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3)
    password: str = Field(..., min_length=4)
    role: str = Field(default="operator")


class UserResponse(BaseModel):
    id: int
    username: str
    role: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str


class ReportPartData(BaseModel):
    part_name: str
    job_type: str = "presence"
    captured_image: Optional[str] = None
    reference_image: Optional[str] = None


class ReportCreate(BaseModel):
    master_name: str
    operator: str
    parts: List[ReportPartData]