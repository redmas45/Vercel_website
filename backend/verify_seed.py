import asyncio
from app.db.models import Base
from app.db.session import engine
from app.db.seed import seed_if_empty

async def run():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await seed_if_empty()

asyncio.run(run())
