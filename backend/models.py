from pydantic import BaseModel, Field, field_validator
from decimal import Decimal
from datetime import date, datetime
from typing import Optional
import uuid


class ExpenseCreate(BaseModel):
    amount: Decimal
    category: str
    description: str
    date: date
    idempotency_key: str = Field(default_factory=lambda: str(uuid.uuid4()))

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("amount must be positive")
        # Round to 2 decimal places
        return v.quantize(Decimal("0.01"))

    @field_validator("category")
    @classmethod
    def category_strip(cls, v: str) -> str:
        return v.strip()

    @field_validator("description")
    @classmethod
    def description_strip(cls, v: str) -> str:
        return v.strip()


class ExpenseUpdate(BaseModel):
    amount: Decimal
    category: str
    description: str
    date: date

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("amount must be positive")
        return v.quantize(Decimal("0.01"))

    @field_validator("category")
    @classmethod
    def category_strip(cls, v: str) -> str:
        return v.strip()

    @field_validator("description")
    @classmethod
    def description_strip(cls, v: str) -> str:
        return v.strip()


class ExpenseResponse(BaseModel):
    id: str
    amount: str
    category: str
    description: str
    date: str
    created_at: str
