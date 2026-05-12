import aiohttp
import asyncio
import random
from typing import Optional


class ChpClient:
    BASE = "https://chp.co.il"

    def __init__(self) -> None:
        self._u: Optional[str] = None
        self._session: Optional[aiohttp.ClientSession] = None

    @property
    def u(self) -> str:
        if self._u is None:
            self._u = str(random.random())
        return self._u

    async def _get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(
                base_url=self.BASE,
                headers={
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "X-Requested-With": "XMLHttpRequest",
                    "Referer": "https://chp.co.il/",
                },
            )
        return self._session

    async def request(self, path: str, params: dict[str, str]) -> str:
        session = await self._get_session()
        params.setdefault("u", self.u)
        async with session.get(path, params=params) as resp:
            resp.raise_for_status()
            return await resp.text()

    async def close(self) -> None:
        if self._session and not self._session.closed:
            await self._session.close()

    async def __aenter__(self) -> "ChpClient":
        return self

    async def __aexit__(self, *args) -> None:
        await self.close()
