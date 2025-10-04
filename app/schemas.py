from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class RoomType(str, Enum):
    single = "single"
    double = "double"
    suite = "suite"


class RoomCreate(BaseModel):
    number: str = Field(min_length=1)
    type: RoomType
    price_per_night: float = Field(gt=0)


class RoomUpdate(BaseModel):
    type: Optional[RoomType]
    price_per_night: Optional[float] = Field(default=None, gt=0)
    is_active: Optional[bool]


class RoomOut(BaseModel):
    id: int
    number: str
    type: RoomType
    price_per_night: float
    is_active: bool

    class Config:
        from_attributes = True


class GuestCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None


class GuestUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None


class GuestOut(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class BookingStatus(str, Enum):
    reserved = "reserved"
    checked_in = "checked_in"
    checked_out = "checked_out"
    cancelled = "cancelled"


class BookingCreate(BaseModel):
    room_id: int
    guest_id: int
    check_in: date
    check_out: date


class BookingOut(BaseModel):
    id: int
    room_id: int
    guest_id: int
    check_in: date
    check_out: date
    status: BookingStatus
    total_amount: float
    created_at: datetime

    class Config:
        from_attributes = True


class PaymentMethod(str, Enum):
    cash = "cash"
    card = "card"
    transfer = "transfer"


class PaymentCreate(BaseModel):
    amount: float = Field(gt=0)
    method: PaymentMethod


class PaymentOut(BaseModel):
    id: int
    booking_id: int
    amount: float
    method: PaymentMethod
    paid_at: datetime

    class Config:
        from_attributes = True
