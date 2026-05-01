"""Integration tests for the FastAPI routes using a mocked MongoDB."""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from mongomock_motor import AsyncMongoMockClient
from unittest.mock import patch

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


def make_mock_db():
    client = AsyncMongoMockClient()
    return client["test_finmo"]


@pytest_asyncio.fixture
async def client():
    mock_db = make_mock_db()
    # Create the unique index that main.py creates on startup
    await mock_db.expenses.create_index("idempotency_key", unique=True, sparse=True)

    with patch("main.get_db", return_value=mock_db):
        from main import app
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            yield c


SAMPLE = {
    "amount": "150.00",
    "category": "Food",
    "description": "Dinner",
    "date": "2026-04-24",
    "idempotency_key": "test-idem-001",
}


@pytest.mark.asyncio
async def test_create_expense_returns_201(client):
    resp = await client.post("/expenses", json=SAMPLE)
    assert resp.status_code == 201
    body = resp.json()
    assert body["amount"] == "150.00"
    assert body["category"] == "Food"
    assert body["description"] == "Dinner"
    assert body["date"] == "2026-04-24"
    assert "id" in body
    assert "created_at" in body


@pytest.mark.asyncio
async def test_create_expense_idempotent(client):
    """Sending the same idempotency_key twice must return the same record, not a duplicate."""
    r1 = await client.post("/expenses", json=SAMPLE)
    r2 = await client.post("/expenses", json=SAMPLE)
    assert r1.status_code == 201
    assert r2.status_code == 201
    assert r1.json()["id"] == r2.json()["id"]


@pytest.mark.asyncio
async def test_list_expenses_empty(client):
    resp = await client.get("/expenses")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_list_expenses_returns_created(client):
    await client.post("/expenses", json=SAMPLE)
    resp = await client.get("/expenses")
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) == 1
    assert items[0]["category"] == "Food"


@pytest.mark.asyncio
async def test_filter_by_category(client):
    await client.post("/expenses", json={**SAMPLE, "idempotency_key": "f1", "category": "Food"})
    await client.post("/expenses", json={**SAMPLE, "idempotency_key": "f2", "category": "Transport"})

    resp = await client.get("/expenses?category=Transport")
    items = resp.json()
    assert all(i["category"] == "Transport" for i in items)
    assert len(items) == 1


@pytest.mark.asyncio
async def test_sort_date_desc(client):
    await client.post("/expenses", json={**SAMPLE, "idempotency_key": "d1", "date": "2026-04-01"})
    await client.post("/expenses", json={**SAMPLE, "idempotency_key": "d2", "date": "2026-04-20"})
    await client.post("/expenses", json={**SAMPLE, "idempotency_key": "d3", "date": "2026-04-10"})

    resp = await client.get("/expenses?sort=date_desc")
    dates = [i["date"] for i in resp.json()]
    assert dates == sorted(dates, reverse=True)


@pytest.mark.asyncio
async def test_negative_amount_rejected(client):
    resp = await client.post("/expenses", json={**SAMPLE, "idempotency_key": "neg", "amount": "-10"})
    assert resp.status_code == 422
