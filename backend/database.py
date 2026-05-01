from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
import os

_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(os.getenv("MONGODB_URL", "mongodb://localhost:27017"))
    return _client


def get_db() -> AsyncIOMotorDatabase:
    return get_client()[os.getenv("DB_NAME", "finmo")]
