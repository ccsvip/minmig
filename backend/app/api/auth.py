from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.schemas.user import LoginRequest, LoginResponse, PasswordChangeRequest
from app.services.auth_service import authenticate_user, change_password
from app.utils.security import get_current_user

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_session)):
    token = await authenticate_user(db, data.username, data.password)
    if token is None:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return LoginResponse(access_token=token, username=data.username)


@router.put("/password")
async def update_password(
    data: PasswordChangeRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    username = current_user.get("sub")
    success = await change_password(db, username, data.old_password, data.new_password)
    if not success:
        raise HTTPException(status_code=400, detail="Old password is incorrect")
    return {"message": "Password updated"}
