from pydantic import BaseModel, Field
from typing import List, Optional


class MasterPartCreate(BaseModel):
    part_name: str
    job_type: str
    expected_count: Optional[int] = None
    image_url: Optional[str] = None


class MasterCreate(BaseModel):
    name: str = Field(..., min_length=1)
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
    job_type: str
    expected_count: Optional[int] = None
    captured_image: Optional[str] = None
    reference_image: Optional[str] = None


class ReportCreate(BaseModel):
    master_name: str
    operator: str
    parts: List[ReportPartData]