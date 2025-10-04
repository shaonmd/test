from __future__ import annotations

from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import List

from ..db import get_db
from ..models import Booking as BookingModel, Room as RoomModel, Guest as GuestModel, BookingStatus
from ..schemas import BookingCreate, BookingOut

router = APIRouter(prefix="/bookings", tags=["bookings"])


def _validate_dates(check_in: date, check_out: date):
    if check_in >= check_out:
        raise HTTPException(status_code=400, detail="check_out must be after check_in")


def _is_room_available(db: Session, room_id: int, check_in: date, check_out: date, exclude_booking_id: int | None = None) -> bool:
    overlap = db.query(BookingModel).filter(
        BookingModel.room_id == room_id,
        BookingModel.status.in_([BookingStatus.reserved, BookingStatus.checked_in]),
        and_(BookingModel.check_in < check_out, BookingModel.check_out > check_in),
        *( [BookingModel.id != exclude_booking_id] if exclude_booking_id else [] ),
    ).first()
    return overlap is None


@router.post("/", response_model=BookingOut, status_code=201)
def create_booking(payload: BookingCreate, db: Session = Depends(get_db)):
    _validate_dates(payload.check_in, payload.check_out)

    room = db.get(RoomModel, payload.room_id)
    if not room or not room.is_active:
        raise HTTPException(status_code=404, detail="Room not available")

    guest = db.get(GuestModel, payload.guest_id)
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")

    if not _is_room_available(db, payload.room_id, payload.check_in, payload.check_out):
        raise HTTPException(status_code=409, detail="Room not available for the selected dates")

    num_nights = (payload.check_out - payload.check_in).days
    total_amount = num_nights * room.price_per_night

    booking = BookingModel(
        room_id=payload.room_id,
        guest_id=payload.guest_id,
        check_in=payload.check_in,
        check_out=payload.check_out,
        total_amount=total_amount,
        status=BookingStatus.reserved,
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking


@router.get("/", response_model=List[BookingOut])
def list_bookings(db: Session = Depends(get_db)):
    return db.query(BookingModel).order_by(BookingModel.created_at.desc()).all()


@router.get("/{booking_id}", response_model=BookingOut)
def get_booking(booking_id: int, db: Session = Depends(get_db)):
    booking = db.get(BookingModel, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


@router.post("/{booking_id}/check-in", response_model=BookingOut)
def check_in(booking_id: int, db: Session = Depends(get_db)):
    booking = db.get(BookingModel, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.status != BookingStatus.reserved:
        raise HTTPException(status_code=400, detail="Booking is not in reserved status")
    booking.status = BookingStatus.checked_in
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking


@router.post("/{booking_id}/check-out", response_model=BookingOut)
def check_out(booking_id: int, db: Session = Depends(get_db)):
    booking = db.get(BookingModel, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.status != BookingStatus.checked_in:
        raise HTTPException(status_code=400, detail="Booking is not in checked_in status")
    booking.status = BookingStatus.checked_out
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking
