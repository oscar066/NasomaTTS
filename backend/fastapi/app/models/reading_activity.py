from beanie import Document, PydanticObjectId
from pymongo import ASCENDING, IndexModel


class ReadingActivity(Document):
    """Words read by a user on a specific calendar day (UTC).

    One document per (user_id, date) pair. The progress endpoint
    increments words_read in-place via $inc so concurrent saves
    from the same session accumulate correctly.
    """

    user_id: PydanticObjectId
    date: str          # ISO date string: "YYYY-MM-DD"
    words_read: int = 0

    class Settings:
        name = "reading_activity"
        indexes = [
            IndexModel(
                [("user_id", ASCENDING), ("date", ASCENDING)],
                name="user_date_unique",
                unique=True,
            ),
        ]
