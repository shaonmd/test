from __future__ import annotations

from datetime import datetime, date
from enum import Enum
from sqlalchemy import (
    String,
    Integer,
    Float,
    ForeignKey,
    DateTime,
    Date,
    UniqueConstraint,
    Enum as SAEnum,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


class RoomType(str, Enum):
    single = "single"
    double = "double"
    suite = "suite"


class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    type: Mapped[RoomType] = mapped_column(SAEnum(RoomType), nullable=False)
    price_per_night: Mapped[float] = mapped_column(Float, nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    bookings: Mapped[list[Booking]] = relationship("Booking", back_populates="room")


class Guest(Base):
    __tablename__ = "guests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    phone: Mapped[str] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    bookings: Mapped[list[Booking]] = relationship("Booking", back_populates="guest")


class BookingStatus(str, Enum):
    reserved = "reserved"
    checked_in = "checked_in"
    checked_out = "checked_out"
    cancelled = "cancelled"


class Booking(Base):
    __tablename__ = "bookings"
    __table_args__ = (
        UniqueConstraint("room_id", "check_in", "check_out", name="uq_room_dates"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id"), nullable=False, index=True)
    guest_id: Mapped[int] = mapped_column(ForeignKey("guests.id"), nullable=False, index=True)
    check_in: Mapped[date] = mapped_column(Date, nullable=False)
    check_out: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[BookingStatus] = mapped_column(SAEnum(BookingStatus), default=BookingStatus.reserved, nullable=False)
    total_amount: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    room: Mapped[Room] = relationship("Room", back_populates="bookings")
    guest: Mapped[Guest] = relationship("Guest", back_populates="bookings")
    payments: Mapped[list[Payment]] = relationship("Payment", back_populates="booking", cascade="all, delete-orphan")


class PaymentMethod(str, Enum):
    cash = "cash"
    card = "card"
    transfer = "transfer"


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    booking_id: Mapped[int] = mapped_column(ForeignKey("bookings.id"), nullable=False, index=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    method: Mapped[PaymentMethod] = mapped_column(SAEnum(PaymentMethod), nullable=False)
    paid_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    booking: Mapped[Booking] = relationship("Booking", back_populates="payments")
