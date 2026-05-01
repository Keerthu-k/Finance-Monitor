"""Unit tests for Pydantic model validation — no database required."""
import pytest
from decimal import Decimal
from pydantic import ValidationError

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from models import ExpenseCreate


def test_valid_expense_accepted():
    e = ExpenseCreate(amount="99.99", category="Food", description="Lunch", date="2026-04-24")
    assert e.amount == Decimal("99.99")
    assert e.category == "Food"
    assert e.idempotency_key  # auto-generated UUID


def test_amount_rounded_to_two_decimals():
    e = ExpenseCreate(amount="10.999", category="Food", description="x", date="2026-04-24")
    assert e.amount == Decimal("11.00")


def test_negative_amount_rejected():
    with pytest.raises(ValidationError) as exc_info:
        ExpenseCreate(amount="-5", category="Food", description="x", date="2026-04-24")
    assert "positive" in str(exc_info.value).lower()


def test_zero_amount_rejected():
    with pytest.raises(ValidationError):
        ExpenseCreate(amount="0", category="Food", description="x", date="2026-04-24")


def test_whitespace_stripped_from_category_and_description():
    e = ExpenseCreate(amount="10", category="  Food  ", description="  Lunch  ", date="2026-04-24")
    assert e.category == "Food"
    assert e.description == "Lunch"


def test_idempotency_key_is_unique_across_instances():
    a = ExpenseCreate(amount="1", category="Food", description="a", date="2026-04-01")
    b = ExpenseCreate(amount="1", category="Food", description="b", date="2026-04-01")
    assert a.idempotency_key != b.idempotency_key


def test_custom_idempotency_key_preserved():
    e = ExpenseCreate(
        amount="1", category="Food", description="a",
        date="2026-04-01", idempotency_key="my-custom-key"
    )
    assert e.idempotency_key == "my-custom-key"
