"""
In-process per-page chapter detection status (D-10).

Ephemeral by design — no persistence layer. Mirrors ModelManager's
module-singleton + classmethod-accessor shape. A page-0-first detection
order lets the reader open the instant page 1 is done (D-07/D-08).
"""

import asyncio

_VALID = ("queued", "detecting", "done", "error")


class ChapterStatus:
    """Class-state singleton for per-comic, per-page detection status."""

    # comic_uuid -> {page_index: "queued"|"detecting"|"done"|"error"}
    STATUS: dict[str, dict[int, str]] = {}
    # comic_uuid -> wakeup signal for SSE listeners
    EVENTS: dict[str, asyncio.Event] = {}

    @classmethod
    def init(cls, comic_uuid: str, page_count: int) -> None:
        cls.STATUS[comic_uuid] = {i: "queued" for i in range(page_count)}
        cls.EVENTS[comic_uuid] = asyncio.Event()

    @classmethod
    def set(cls, comic_uuid: str, page: int, status: str) -> None:
        if status not in _VALID:
            raise ValueError(f"Invalid page status: {status}")
        cls.STATUS.setdefault(comic_uuid, {})[page] = status

    @classmethod
    def snapshot(cls, comic_uuid: str) -> dict[int, str]:
        return dict(cls.STATUS.get(comic_uuid, {}))

    @classmethod
    def wake(cls, comic_uuid: str) -> None:
        ev = cls.EVENTS.get(comic_uuid)
        if ev is not None:
            ev.set()

    @classmethod
    def page_1_ready(cls, comic_uuid: str) -> bool:
        """True when page 0 has finished detecting (the START READING gate)."""
        return cls.STATUS.get(comic_uuid, {}).get(0) == "done"
