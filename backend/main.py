from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from bson import ObjectId
from typing import Optional
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

from database import get_db, get_client
from models import ExpenseCreate, ExpenseUpdate, ExpenseResponse


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create unique index on idempotency_key so duplicate inserts are rejected at DB level
    db = get_db()
    await db.expenses.create_index("idempotency_key", unique=True, sparse=True)
    yield
    get_client().close()


app = FastAPI(title="Expense Tracker API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _serialize(doc: dict) -> ExpenseResponse:
    return ExpenseResponse(
        id=str(doc["_id"]),
        amount=doc["amount"],
        category=doc["category"],
        description=doc["description"],
        date=doc["date"].isoformat() if isinstance(doc["date"], datetime) else str(doc["date"]),
        created_at=doc["created_at"].isoformat(),
    )


@app.post("/expenses", response_model=ExpenseResponse, status_code=201)
async def create_expense(expense: ExpenseCreate):
    db = get_db()

    # Idempotency: return existing record if the same key was already processed
    existing = await db.expenses.find_one({"idempotency_key": expense.idempotency_key})
    if existing:
        return _serialize(existing)

    doc = {
        "amount": str(expense.amount),
        "category": expense.category,
        "description": expense.description,
        # Store date as ISO string so it sorts correctly as a string
        "date": expense.date.isoformat(),
        "created_at": datetime.utcnow(),
        "idempotency_key": expense.idempotency_key,
    }

    result = await db.expenses.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize(doc)


@app.get("/expenses", response_model=list[ExpenseResponse])
async def list_expenses(
    category: Optional[str] = Query(None),
    sort: Optional[str] = Query(None),
):
    db = get_db()

    query: dict = {}
    if category:
        query["category"] = category

    # Default to date descending; fall back to created_at desc for ties
    sort_field = "date" if sort == "date_desc" else "created_at"
    cursor = db.expenses.find(query).sort([(sort_field, -1), ("created_at", -1)])
    expenses = await cursor.to_list(length=1000)

    return [_serialize(e) for e in expenses]


@app.put("/expenses/{expense_id}", response_model=ExpenseResponse)
async def update_expense(expense_id: str, expense: ExpenseUpdate):
    db = get_db()
    try:
        oid = ObjectId(expense_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid expense ID")

    update_data = {
        "amount": str(expense.amount),
        "category": expense.category,
        "description": expense.description,
        "date": expense.date.isoformat(),
    }

    result = await db.expenses.find_one_and_update(
        {"_id": oid},
        {"$set": update_data},
        return_document=True,
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Expense not found")
    return _serialize(result)


@app.delete("/expenses/{expense_id}", status_code=204)
async def delete_expense(expense_id: str):
    db = get_db()
    try:
        oid = ObjectId(expense_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid expense ID")

    result = await db.expenses.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
