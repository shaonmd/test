from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..db import get_db
from ..models import Guest as GuestModel
from ..schemas import GuestCreate, GuestUpdate, GuestOut

router = APIRouter(prefix="/guests", tags=["guests"])


@router.post("/", response_model=GuestOut, status_code=201)
def create_guest(payload: GuestCreate, db: Session = Depends(get_db)):
    conflict = db.query(GuestModel).filter(GuestModel.email == payload.email).first()
    if conflict:
        raise HTTPException(status_code=409, detail="Email already registered")
    guest = GuestModel(**payload.model_dump())
    db.add(guest)
    db.commit()
    db.refresh(guest)
    return guest


@router.get("/", response_model=List[GuestOut])
def list_guests(db: Session = Depends(get_db)):
    return db.query(GuestModel).order_by(GuestModel.created_at.desc()).all()


@router.get("/{guest_id}", response_model=GuestOut)
def get_guest(guest_id: int, db: Session = Depends(get_db)):
    guest = db.get(GuestModel, guest_id)
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")
    return guest


@router.patch("/{guest_id}", response_model=GuestOut)
def update_guest(guest_id: int, payload: GuestUpdate, db: Session = Depends(get_db)):
    guest = db.get(GuestModel, guest_id)
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(guest, key, value)
    db.add(guest)
    db.commit()
    db.refresh(guest)
    return guest


@router.delete("/{guest_id}", status_code=204)
def delete_guest(guest_id: int, db: Session = Depends(get_db)):
    guest = db.get(GuestModel, guest_id)
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")
    db.delete(guest)
    db.commit()
    return None
