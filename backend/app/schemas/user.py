from pydantic import BaseModel
from typing import Optional

class UserBase(BaseModel):
    email: str
    role: Optional[str] = "viewer"
    is_active: Optional[bool] = True

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class UserResponse(UserBase):
    id: int

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    email: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None
