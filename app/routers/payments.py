from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..db import get_db
from ..models import Payment as PaymentModel, Booking as BookingModel
from ..schemas import PaymentCreate, PaymentOut

router = APIRouter(prefix="/bookings/{booking_id}/payments", tags=["payments"])


@router.post("/", response_model=PaymentOut, status_code=201)
def create_payment(booking_id: int, payload: PaymentCreate, db: Session = Depends(get_db)):
    booking = db.get(BookingModel, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    payment = PaymentModel(booking_id=booking_id, amount=payload.amount, method=payload.method)
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


@router.get("/", response_model=List[PaymentOut])
def list_payments(booking_id: int, db: Session = Depends(get_db)):
    booking = db.get(BookingModel, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return db.query(PaymentModel).where(PaymentModel.booking_id == booking_id).order_by(PaymentModel.paid_at.desc()).all()
