from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core import security
from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, Token

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = security.jwt.decode(token, settings.SECRET_KEY, algorithms=[security.ALGORITHM])
        user_email: str = payload.get("sub")
        if user_email is None:
            raise credentials_exception
    except Exception:
        raise credentials_exception
    
    normalized_email = user_email.strip().lower()
    user = db.query(User).filter(User.email == normalized_email).first()
    if user is None:
        raise credentials_exception
    return user

@router.post("/signup", response_model=UserResponse)
def signup(user_in: UserCreate, db: Session = Depends(get_db)):
    normalized_email = user_in.email.strip().lower()
    user = db.query(User).filter(User.email == normalized_email).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="User with this email already exists.",
        )
    
    is_first = db.query(User).count() == 0
    role = "admin" if is_first else user_in.role
    
    hashed_pwd = security.get_password_hash(user_in.password)
    new_user = User(
        email=normalized_email,
        hashed_password=hashed_pwd,
        role=role,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    normalized_email = form_data.username.strip().lower()
    user = db.query(User).filter(User.email == normalized_email).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account"
        )
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = security.create_access_token(
        user.email, expires_delta=access_token_expires
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "email": user.email
    }

@router.post("/refresh", response_model=Token)
def refresh_token(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = security.create_access_token(
        current_user.email, expires_delta=access_token_expires
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": current_user.role,
        "email": current_user.email
    }

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    return {"detail": "Successfully logged out"}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
