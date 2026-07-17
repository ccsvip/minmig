from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory
from app.models.user import User
from app.utils.security import hash_password, verify_password, create_access_token


async def authenticate_user(db: AsyncSession, username: str, password: str) -> str | None:
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if user and verify_password(password, user.password_hash):
        return create_access_token({"sub": user.username, "id": user.id})
    return None


async def change_password(db: AsyncSession, username: str, old_password: str, new_password: str) -> bool:
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(old_password, user.password_hash):
        return False
    user.password_hash = hash_password(new_password)
    await db.commit()
    return True


async def create_default_user():
    from app.config import get_settings
    settings = get_settings()
    async with async_session_factory() as db:
        result = await db.execute(select(User).where(User.username == settings.default_username))
        if result.scalar_one_or_none() is None:
            user = User(
                username=settings.default_username,
                password_hash=hash_password(settings.default_password),
            )
            db.add(user)
            await db.commit()
