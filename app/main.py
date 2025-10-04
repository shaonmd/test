from fastapi import FastAPI

from .db import Base, engine
from .routers import rooms, guests, bookings, payments

app = FastAPI(title="Hotel Management API", version="0.1.0")

@app.get("/health")
def health_check():
    return {"status": "ok"}


app.include_router(rooms.router)
app.include_router(guests.router)
app.include_router(bookings.router)
app.include_router(payments.router)


@app.on_event("startup")
def on_startup():
    # Ensure all tables are created
    Base.metadata.create_all(bind=engine)
