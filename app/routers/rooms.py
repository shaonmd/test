from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from ..db import get_db, Base, engine
from ..models import Room as RoomModel, RoomType as RoomTypeEnum
from ..schemas import RoomCreate, RoomUpdate, RoomOut

router = APIRouter(prefix="/rooms", tags=["rooms"])


# Ensure tables exist when router is imported (simple bootstrap)
Base.metadata.create_all(bind=engine)


@router.post("/", response_model=RoomOut, status_code=201)
def create_room(payload: RoomCreate, db: Session = Depends(get_db)):
    conflict = db.query(RoomModel).filter(RoomModel.number == payload.number).first()
    if conflict:
        raise HTTPException(status_code=409, detail="Room number already exists")
    room = RoomModel(number=payload.number, type=payload.type, price_per_night=payload.price_per_night)
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


@router.get("/", response_model=List[RoomOut])
def list_rooms(
    db: Session = Depends(get_db),
    is_active: Optional[bool] = Query(None),
    room_type: Optional[RoomTypeEnum] = Query(None),
):
    q = db.query(RoomModel)
    if is_active is not None:
        q = q.filter(RoomModel.is_active == is_active)
    if room_type is not None:
        q = q.filter(RoomModel.type == room_type)
    return q.order_by(RoomModel.number.asc()).all()


@router.get("/{room_id}", response_model=RoomOut)
def get_room(room_id: int, db: Session = Depends(get_db)):
    room = db.get(RoomModel, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room


@router.patch("/{room_id}", response_model=RoomOut)
def update_room(room_id: int, payload: RoomUpdate, db: Session = Depends(get_db)):
    room = db.get(RoomModel, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(room, key, value)
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


@router.delete("/{room_id}", status_code=204)
def delete_room(room_id: int, db: Session = Depends(get_db)):
    room = db.get(RoomModel, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    db.delete(room)
    db.commit()
    return None
