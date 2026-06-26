from fastapi import APIRouter, Depends

from ..models.user import User
from ..utils.deps import get_current_user

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("")
async def get_leaderboard(current_user: User = Depends(get_current_user)):
    pipeline = [
        {"$match": {"is_active": True, "words_read": {"$gt": 0}}},
        {
            "$lookup": {
                "from": "documents",
                "localField": "_id",
                "foreignField": "author",
                "as": "docs",
            }
        },
        {
            "$project": {
                "_id": 0,
                "user_id": {"$toString": "$_id"},
                "username": 1,
                "avatar": 1,
                "plan": 1,
                "total_words": {"$ifNull": ["$words_read", 0]},
                "doc_count": {"$size": "$docs"},
                "finished_count": {
                    "$size": {
                        "$filter": {
                            "input": "$docs",
                            "as": "d",
                            "cond": {"$eq": ["$$d.reading_status", "finished"]},
                        }
                    }
                },
            }
        },
        {"$sort": {"total_words": -1, "finished_count": -1, "doc_count": -1}},
    ]

    raw: list[dict] = await User.get_motor_collection().aggregate(pipeline).to_list(None)

    ranked = []
    my_entry = None
    current_uid = str(current_user.id)

    for i, row in enumerate(raw):
        entry = {
            "rank": i + 1,
            "user_id": row["user_id"],
            "username": row["username"],
            "avatar": row.get("avatar", ""),
            "plan": row.get("plan", "free"),
            "doc_count": row["doc_count"],
            "finished_count": row["finished_count"],
            "total_words": row["total_words"],
            "is_me": row["user_id"] == current_uid,
        }

        if i < 20:
            ranked.append(entry)

        if row["user_id"] == current_uid:
            my_entry = entry

    return {
        "entries": ranked,
        "me": my_entry,
    }