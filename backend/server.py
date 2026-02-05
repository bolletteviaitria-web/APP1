from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutSessionRequest
import aiohttp
from icalendar import Calendar

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'default_secret_key')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Stripe Configuration
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', 'sk_test_emergent')

# Create the main app
app = FastAPI(title="VacayStay - Luxury Vacation Rentals")

# Create router with /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============ PYDANTIC MODELS ============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None
    
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    phone: Optional[str] = None
    role: str
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class PropertyTranslation(BaseModel):
    title: str
    description: str
    area_description: Optional[str] = None

class PropertyPricing(BaseModel):
    base_price: float
    weekend_price: Optional[float] = None
    weekly_discount: float = 0  # percentage
    monthly_discount: float = 0
    cleaning_fee: float = 0
    security_deposit: float = 0
    extra_guest_fee: float = 0

class PropertySeason(BaseModel):
    name: str
    start_date: str
    end_date: str
    price_multiplier: float = 1.0

class PropertyExtra(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name_it: str
    name_en: str
    price: float
    per_night: bool = False

class PropertyCreate(BaseModel):
    slug: str
    translations: Dict[str, PropertyTranslation]  # 'it', 'en'
    location: Dict[str, Any]  # {address, city, region, country, lat, lng}
    amenities: List[str]
    max_guests: int
    bedrooms: int
    bathrooms: int
    images: List[str]
    pricing: PropertyPricing
    seasons: List[PropertySeason] = []
    extras: List[PropertyExtra] = []
    min_nights: int = 1
    is_active: bool = True

class PropertyResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    slug: str
    translations: Dict[str, PropertyTranslation]
    location: Dict[str, Any]
    amenities: List[str]
    max_guests: int
    bedrooms: int
    bathrooms: int
    images: List[str]
    pricing: PropertyPricing
    seasons: List[PropertySeason]
    extras: List[PropertyExtra]
    min_nights: int
    is_active: bool
    average_rating: float = 0
    total_reviews: int = 0
    created_at: str

class BookingCreate(BaseModel):
    property_id: str
    check_in: str
    check_out: str
    guests: int
    guest_name: str
    guest_email: EmailStr
    guest_phone: str
    extras: List[str] = []
    notes: Optional[str] = None

class BookingResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    property_id: str
    user_id: Optional[str] = None
    check_in: str
    check_out: str
    guests: int
    guest_name: str
    guest_email: str
    guest_phone: str
    extras: List[str]
    notes: Optional[str]
    total_price: float
    deposit_amount: float
    status: str  # pending, confirmed, cancelled, completed
    payment_status: str  # pending, partial, paid, refunded
    source: str  # direct, airbnb, booking
    created_at: str

class ReviewCreate(BaseModel):
    property_id: str
    booking_id: str
    rating: int = Field(ge=1, le=5)
    title: str
    comment: str
    guest_name: str

class ReviewResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    property_id: str
    booking_id: str
    rating: int
    title: str
    comment: str
    guest_name: str
    created_at: str

class ICalSyncCreate(BaseModel):
    property_id: str
    platform: str  # airbnb, booking
    ical_url: str

class ContactMessage(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    property_id: Optional[str] = None
    message: str

class PriceCalculation(BaseModel):
    property_id: str
    check_in: str
    check_out: str
    guests: int
    extras: List[str] = []

class PriceBreakdown(BaseModel):
    nights: int
    base_total: float
    seasonal_adjustment: float
    extras_total: float
    cleaning_fee: float
    security_deposit: float
    subtotal: float
    total: float

# ============ AUTH HELPERS ============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        return user
    except:
        return None

async def require_auth(credentials: HTTPAuthorizationCredentials = Depends(security)):
    user = await get_current_user(credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

async def require_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    user = await require_auth(credentials)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ============ AUTH ROUTES ============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(data: UserCreate):
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": data.email,
        "password": hash_password(data.password),
        "full_name": data.full_name,
        "phone": data.phone,
        "role": "user",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, data.email, "user")
    user_response = UserResponse(
        id=user_id, email=data.email, full_name=data.full_name,
        phone=data.phone, role="user", created_at=user_doc["created_at"]
    )
    return TokenResponse(access_token=token, user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["email"], user["role"])
    user_response = UserResponse(
        id=user["id"], email=user["email"], full_name=user["full_name"],
        phone=user.get("phone"), role=user["role"], created_at=user["created_at"]
    )
    return TokenResponse(access_token=token, user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(require_auth)):
    return UserResponse(
        id=user["id"], email=user["email"], full_name=user["full_name"],
        phone=user.get("phone"), role=user["role"], created_at=user["created_at"]
    )

# ============ PROPERTY ROUTES ============

@api_router.post("/properties", response_model=PropertyResponse)
async def create_property(data: PropertyCreate, user: dict = Depends(require_admin)):
    existing = await db.properties.find_one({"slug": data.slug})
    if existing:
        raise HTTPException(status_code=400, detail="Property slug already exists")
    
    property_id = str(uuid.uuid4())
    property_doc = {
        "id": property_id,
        **data.model_dump(),
        "average_rating": 0,
        "total_reviews": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.properties.insert_one(property_doc)
    del property_doc["_id"]
    return PropertyResponse(**property_doc)

@api_router.get("/properties", response_model=List[PropertyResponse])
async def get_properties(
    lang: str = "it",
    city: Optional[str] = None,
    min_guests: Optional[int] = None,
    max_price: Optional[float] = None,
    active_only: bool = True
):
    query = {}
    if active_only:
        query["is_active"] = True
    if city:
        query["location.city"] = {"$regex": city, "$options": "i"}
    if min_guests:
        query["max_guests"] = {"$gte": min_guests}
    if max_price:
        query["pricing.base_price"] = {"$lte": max_price}
    
    properties = await db.properties.find(query, {"_id": 0}).to_list(100)
    return [PropertyResponse(**p) for p in properties]

@api_router.get("/properties/{property_id}", response_model=PropertyResponse)
async def get_property(property_id: str):
    property_doc = await db.properties.find_one(
        {"$or": [{"id": property_id}, {"slug": property_id}]},
        {"_id": 0}
    )
    if not property_doc:
        raise HTTPException(status_code=404, detail="Property not found")
    return PropertyResponse(**property_doc)

@api_router.put("/properties/{property_id}", response_model=PropertyResponse)
async def update_property(property_id: str, data: PropertyCreate, user: dict = Depends(require_admin)):
    result = await db.properties.update_one(
        {"id": property_id},
        {"$set": data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Property not found")
    
    updated = await db.properties.find_one({"id": property_id}, {"_id": 0})
    return PropertyResponse(**updated)

@api_router.delete("/properties/{property_id}")
async def delete_property(property_id: str, user: dict = Depends(require_admin)):
    result = await db.properties.delete_one({"id": property_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Property not found")
    return {"message": "Property deleted"}

# ============ PRICE CALCULATION ============

@api_router.post("/properties/calculate-price", response_model=PriceBreakdown)
async def calculate_price(data: PriceCalculation):
    property_doc = await db.properties.find_one({"id": data.property_id}, {"_id": 0})
    if not property_doc:
        raise HTTPException(status_code=404, detail="Property not found")
    
    check_in = datetime.fromisoformat(data.check_in)
    check_out = datetime.fromisoformat(data.check_out)
    nights = (check_out - check_in).days
    
    if nights < property_doc.get("min_nights", 1):
        raise HTTPException(status_code=400, detail=f"Minimum {property_doc['min_nights']} nights required")
    
    pricing = property_doc["pricing"]
    base_price = pricing["base_price"]
    
    # Calculate base total with weekend pricing
    base_total = 0.0
    current = check_in
    while current < check_out:
        if current.weekday() >= 5 and pricing.get("weekend_price"):
            base_total += pricing["weekend_price"]
        else:
            base_total += base_price
        current += timedelta(days=1)
    
    # Apply seasonal adjustments
    seasonal_adjustment = 0.0
    for season in property_doc.get("seasons", []):
        season_start = datetime.fromisoformat(season["start_date"])
        season_end = datetime.fromisoformat(season["end_date"])
        if check_in <= season_end and check_out >= season_start:
            overlap_start = max(check_in, season_start)
            overlap_end = min(check_out, season_end)
            overlap_nights = (overlap_end - overlap_start).days
            adjustment = base_price * overlap_nights * (season["price_multiplier"] - 1)
            seasonal_adjustment += adjustment
    
    # Apply weekly/monthly discounts
    if nights >= 30 and pricing.get("monthly_discount"):
        base_total *= (1 - pricing["monthly_discount"] / 100)
    elif nights >= 7 and pricing.get("weekly_discount"):
        base_total *= (1 - pricing["weekly_discount"] / 100)
    
    # Calculate extras
    extras_total = 0.0
    for extra_id in data.extras:
        for extra in property_doc.get("extras", []):
            if extra["id"] == extra_id:
                if extra.get("per_night"):
                    extras_total += extra["price"] * nights
                else:
                    extras_total += extra["price"]
    
    # Extra guest fee
    if data.guests > 2 and pricing.get("extra_guest_fee"):
        extras_total += pricing["extra_guest_fee"] * (data.guests - 2) * nights
    
    cleaning_fee = pricing.get("cleaning_fee", 0)
    security_deposit = pricing.get("security_deposit", 0)
    subtotal = base_total + seasonal_adjustment + extras_total + cleaning_fee
    total = subtotal + security_deposit
    
    return PriceBreakdown(
        nights=nights,
        base_total=round(base_total, 2),
        seasonal_adjustment=round(seasonal_adjustment, 2),
        extras_total=round(extras_total, 2),
        cleaning_fee=cleaning_fee,
        security_deposit=security_deposit,
        subtotal=round(subtotal, 2),
        total=round(total, 2)
    )

# ============ BOOKING ROUTES ============

@api_router.post("/bookings", response_model=BookingResponse)
async def create_booking(data: BookingCreate, user: dict = Depends(get_current_user)):
    property_doc = await db.properties.find_one({"id": data.property_id}, {"_id": 0})
    if not property_doc:
        raise HTTPException(status_code=404, detail="Property not found")
    
    check_in = datetime.fromisoformat(data.check_in)
    check_out = datetime.fromisoformat(data.check_out)
    
    # Check availability
    conflicting = await db.bookings.find_one({
        "property_id": data.property_id,
        "status": {"$in": ["pending", "confirmed"]},
        "$or": [
            {"check_in": {"$lt": data.check_out}, "check_out": {"$gt": data.check_in}}
        ]
    })
    if conflicting:
        raise HTTPException(status_code=400, detail="Property not available for these dates")
    
    # Calculate price
    price_data = PriceCalculation(
        property_id=data.property_id,
        check_in=data.check_in,
        check_out=data.check_out,
        guests=data.guests,
        extras=data.extras
    )
    price_breakdown = await calculate_price(price_data)
    
    booking_id = str(uuid.uuid4())
    booking_doc = {
        "id": booking_id,
        "property_id": data.property_id,
        "user_id": user["id"] if user else None,
        "check_in": data.check_in,
        "check_out": data.check_out,
        "guests": data.guests,
        "guest_name": data.guest_name,
        "guest_email": data.guest_email,
        "guest_phone": data.guest_phone,
        "extras": data.extras,
        "notes": data.notes,
        "total_price": price_breakdown.total,
        "deposit_amount": price_breakdown.security_deposit,
        "status": "pending",
        "payment_status": "pending",
        "source": "direct",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.bookings.insert_one(booking_doc)
    del booking_doc["_id"]
    return BookingResponse(**booking_doc)

@api_router.get("/bookings", response_model=List[BookingResponse])
async def get_bookings(
    property_id: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(require_admin)
):
    query = {}
    if property_id:
        query["property_id"] = property_id
    if status:
        query["status"] = status
    
    bookings = await db.bookings.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [BookingResponse(**b) for b in bookings]

@api_router.get("/bookings/my", response_model=List[BookingResponse])
async def get_my_bookings(user: dict = Depends(require_auth)):
    bookings = await db.bookings.find(
        {"$or": [{"user_id": user["id"]}, {"guest_email": user["email"]}]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return [BookingResponse(**b) for b in bookings]

@api_router.get("/bookings/{booking_id}", response_model=BookingResponse)
async def get_booking(booking_id: str):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return BookingResponse(**booking)

@api_router.patch("/bookings/{booking_id}/status")
async def update_booking_status(
    booking_id: str,
    status: str,
    user: dict = Depends(require_admin)
):
    if status not in ["pending", "confirmed", "cancelled", "completed"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    return {"message": f"Booking status updated to {status}"}

# ============ AVAILABILITY ============

@api_router.get("/properties/{property_id}/availability")
async def get_availability(property_id: str, month: Optional[str] = None):
    property_doc = await db.properties.find_one({"id": property_id}, {"_id": 0})
    if not property_doc:
        raise HTTPException(status_code=404, detail="Property not found")
    
    if month:
        start_date = datetime.fromisoformat(f"{month}-01")
    else:
        start_date = datetime.now(timezone.utc).replace(day=1)
    
    end_date = start_date + timedelta(days=90)
    
    bookings = await db.bookings.find({
        "property_id": property_id,
        "status": {"$in": ["pending", "confirmed"]},
        "check_in": {"$lte": end_date.isoformat()},
        "check_out": {"$gte": start_date.isoformat()}
    }, {"_id": 0, "check_in": 1, "check_out": 1, "source": 1}).to_list(100)
    
    # Get iCal blocked dates
    ical_syncs = await db.ical_syncs.find({"property_id": property_id}, {"_id": 0}).to_list(10)
    blocked_dates = []
    
    for sync in ical_syncs:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(sync["ical_url"]) as response:
                    if response.status == 200:
                        ical_data = await response.text()
                        cal = Calendar.from_ical(ical_data)
                        for component in cal.walk():
                            if component.name == "VEVENT":
                                start = component.get('dtstart').dt
                                end = component.get('dtend').dt
                                if hasattr(start, 'date'):
                                    start = start.date()
                                if hasattr(end, 'date'):
                                    end = end.date()
                                blocked_dates.append({
                                    "start": str(start),
                                    "end": str(end),
                                    "source": sync["platform"]
                                })
        except Exception as e:
            logger.error(f"iCal sync error: {e}")
    
    return {
        "property_id": property_id,
        "bookings": bookings,
        "blocked_dates": blocked_dates
    }

# ============ STRIPE PAYMENT ============

@api_router.post("/payments/create-checkout")
async def create_checkout(
    request: Request,
    booking_id: str,
    payment_type: str = "full"  # full, deposit
):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    amount = booking["total_price"] if payment_type == "full" else booking["deposit_amount"]
    
    # Get frontend URL from request origin or use backend URL
    origin = request.headers.get("origin", host_url)
    success_url = f"{origin}/booking/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/booking/{booking_id}"
    
    checkout_request = CheckoutSessionRequest(
        amount=float(amount),
        currency="eur",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "booking_id": booking_id,
            "payment_type": payment_type
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record
    transaction = {
        "id": str(uuid.uuid4()),
        "booking_id": booking_id,
        "session_id": session.session_id,
        "amount": amount,
        "currency": "eur",
        "payment_type": payment_type,
        "status": "initiated",
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_transactions.insert_one(transaction)
    
    return {"checkout_url": session.url, "session_id": session.session_id}

@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str, request: Request):
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    status = await stripe_checkout.get_checkout_status(session_id)
    
    # Update transaction and booking
    if status.payment_status == "paid":
        transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
        if transaction:
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"status": "completed", "payment_status": "paid"}}
            )
            
            payment_type = transaction.get("payment_type", "full")
            new_payment_status = "paid" if payment_type == "full" else "partial"
            
            await db.bookings.update_one(
                {"id": transaction["booking_id"]},
                {"$set": {"payment_status": new_payment_status, "status": "confirmed"}}
            )
    
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount": status.amount_total / 100,
        "currency": status.currency
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    try:
        event = await stripe_checkout.handle_webhook(body, signature)
        
        if event.payment_status == "paid":
            await db.payment_transactions.update_one(
                {"session_id": event.session_id},
                {"$set": {"status": "completed", "payment_status": "paid"}}
            )
            
            transaction = await db.payment_transactions.find_one({"session_id": event.session_id}, {"_id": 0})
            if transaction:
                payment_type = transaction.get("payment_type", "full")
                new_status = "paid" if payment_type == "full" else "partial"
                await db.bookings.update_one(
                    {"id": transaction["booking_id"]},
                    {"$set": {"payment_status": new_status, "status": "confirmed"}}
                )
        
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

# ============ REVIEWS ============

@api_router.post("/reviews", response_model=ReviewResponse)
async def create_review(data: ReviewCreate):
    booking = await db.bookings.find_one({"id": data.booking_id, "status": "completed"}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=400, detail="Can only review completed bookings")
    
    existing = await db.reviews.find_one({"booking_id": data.booking_id})
    if existing:
        raise HTTPException(status_code=400, detail="Review already exists for this booking")
    
    review_id = str(uuid.uuid4())
    review_doc = {
        "id": review_id,
        **data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.reviews.insert_one(review_doc)
    
    # Update property rating
    reviews = await db.reviews.find({"property_id": data.property_id}, {"rating": 1}).to_list(1000)
    avg_rating = sum(r["rating"] for r in reviews) / len(reviews)
    await db.properties.update_one(
        {"id": data.property_id},
        {"$set": {"average_rating": round(avg_rating, 1), "total_reviews": len(reviews)}}
    )
    
    del review_doc["_id"]
    return ReviewResponse(**review_doc)

@api_router.get("/reviews/{property_id}", response_model=List[ReviewResponse])
async def get_property_reviews(property_id: str):
    reviews = await db.reviews.find({"property_id": property_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [ReviewResponse(**r) for r in reviews]

# ============ iCAL SYNC ============

@api_router.post("/ical-sync")
async def create_ical_sync(data: ICalSyncCreate, user: dict = Depends(require_admin)):
    sync_id = str(uuid.uuid4())
    sync_doc = {
        "id": sync_id,
        **data.model_dump(),
        "last_synced": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.ical_syncs.insert_one(sync_doc)
    return {"id": sync_id, "message": "iCal sync created"}

@api_router.get("/ical-sync/{property_id}")
async def get_ical_syncs(property_id: str, user: dict = Depends(require_admin)):
    syncs = await db.ical_syncs.find({"property_id": property_id}, {"_id": 0}).to_list(10)
    return syncs

@api_router.delete("/ical-sync/{sync_id}")
async def delete_ical_sync(sync_id: str, user: dict = Depends(require_admin)):
    result = await db.ical_syncs.delete_one({"id": sync_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sync not found")
    return {"message": "iCal sync deleted"}

# ============ CONTACT ============

@api_router.post("/contact")
async def send_contact(data: ContactMessage):
    contact_id = str(uuid.uuid4())
    contact_doc = {
        "id": contact_id,
        **data.model_dump(),
        "status": "new",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.contacts.insert_one(contact_doc)
    return {"message": "Message sent successfully", "id": contact_id}

@api_router.get("/contacts")
async def get_contacts(user: dict = Depends(require_admin)):
    contacts = await db.contacts.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return contacts

# ============ ADMIN DASHBOARD ============

@api_router.get("/admin/dashboard")
async def get_dashboard(user: dict = Depends(require_admin)):
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    total_properties = await db.properties.count_documents({"is_active": True})
    total_bookings = await db.bookings.count_documents({})
    pending_bookings = await db.bookings.count_documents({"status": "pending"})
    
    month_bookings = await db.bookings.find({
        "created_at": {"$gte": month_start.isoformat()},
        "payment_status": "paid"
    }, {"total_price": 1}).to_list(1000)
    month_revenue = sum(b.get("total_price", 0) for b in month_bookings)
    
    upcoming_checkins = await db.bookings.find({
        "check_in": {"$gte": now.isoformat(), "$lte": (now + timedelta(days=7)).isoformat()},
        "status": "confirmed"
    }, {"_id": 0}).to_list(10)
    
    upcoming_checkouts = await db.bookings.find({
        "check_out": {"$gte": now.isoformat(), "$lte": (now + timedelta(days=7)).isoformat()},
        "status": "confirmed"
    }, {"_id": 0}).to_list(10)
    
    recent_contacts = await db.contacts.find({"status": "new"}, {"_id": 0}).sort("created_at", -1).to_list(5)
    
    return {
        "total_properties": total_properties,
        "total_bookings": total_bookings,
        "pending_bookings": pending_bookings,
        "month_revenue": round(month_revenue, 2),
        "upcoming_checkins": upcoming_checkins,
        "upcoming_checkouts": upcoming_checkouts,
        "recent_contacts": recent_contacts
    }

# ============ SEED DATA ============

@api_router.post("/seed")
async def seed_demo_data():
    """Seed database with 5 demo properties"""
    
    # Check if already seeded
    existing = await db.properties.count_documents({})
    if existing > 0:
        return {"message": "Database already has properties"}
    
    # Create admin user
    admin_exists = await db.users.find_one({"email": "admin@vacaystay.com"})
    if not admin_exists:
        admin_id = str(uuid.uuid4())
        await db.users.insert_one({
            "id": admin_id,
            "email": "admin@vacaystay.com",
            "password": hash_password("admin123"),
            "full_name": "Admin VacayStay",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    properties = [
        {
            "id": str(uuid.uuid4()),
            "slug": "villa-smeraldo",
            "translations": {
                "it": {
                    "title": "Villa Smeraldo",
                    "description": "Lussuosa villa con vista mare mozzafiato sulla Costa Smeralda. Piscina a sfioro, giardino mediterraneo e interni di design.",
                    "area_description": "A pochi minuti dalle spiagge più esclusive della Sardegna"
                },
                "en": {
                    "title": "Emerald Villa",
                    "description": "Luxurious villa with breathtaking sea views on the Costa Smeralda. Infinity pool, Mediterranean garden and designer interiors.",
                    "area_description": "Minutes from Sardinia's most exclusive beaches"
                }
            },
            "location": {
                "address": "Via delle Ginestre 15",
                "city": "Porto Cervo",
                "region": "Sardegna",
                "country": "Italia",
                "lat": 41.1303,
                "lng": 9.5338
            },
            "amenities": ["pool", "wifi", "ac", "parking", "sea_view", "garden", "bbq", "dishwasher"],
            "max_guests": 8,
            "bedrooms": 4,
            "bathrooms": 3,
            "images": [
                "https://images.unsplash.com/photo-1672226405717-697c84f48f9e?w=1200",
                "https://images.unsplash.com/photo-1678686425633-84fc103e2727?w=1200",
                "https://images.unsplash.com/photo-1724582586470-85422853ad61?w=1200"
            ],
            "pricing": {
                "base_price": 450.0,
                "weekend_price": 550.0,
                "weekly_discount": 10,
                "monthly_discount": 20,
                "cleaning_fee": 150.0,
                "security_deposit": 500.0,
                "extra_guest_fee": 30.0
            },
            "seasons": [
                {"name": "Alta Stagione", "start_date": "2024-07-01", "end_date": "2024-08-31", "price_multiplier": 1.5},
                {"name": "Media Stagione", "start_date": "2024-06-01", "end_date": "2024-06-30", "price_multiplier": 1.2}
            ],
            "extras": [
                {"id": str(uuid.uuid4()), "name_it": "Colazione", "name_en": "Breakfast", "price": 25.0, "per_night": True},
                {"id": str(uuid.uuid4()), "name_it": "Transfer Aeroporto", "name_en": "Airport Transfer", "price": 100.0, "per_night": False}
            ],
            "min_nights": 3,
            "is_active": True,
            "average_rating": 4.9,
            "total_reviews": 24,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "slug": "casa-amalfi",
            "translations": {
                "it": {
                    "title": "Casa Amalfi",
                    "description": "Elegante appartamento nel cuore della Costiera Amalfitana con terrazza panoramica e accesso privato al mare.",
                    "area_description": "Nel centro storico di Amalfi, a pochi passi dal Duomo"
                },
                "en": {
                    "title": "Amalfi House",
                    "description": "Elegant apartment in the heart of the Amalfi Coast with panoramic terrace and private sea access.",
                    "area_description": "In the historic center of Amalfi, steps from the Cathedral"
                }
            },
            "location": {
                "address": "Via Lorenzo d'Amalfi 28",
                "city": "Amalfi",
                "region": "Campania",
                "country": "Italia",
                "lat": 40.6340,
                "lng": 14.6027
            },
            "amenities": ["wifi", "ac", "sea_view", "terrace", "washing_machine", "kitchen"],
            "max_guests": 4,
            "bedrooms": 2,
            "bathrooms": 2,
            "images": [
                "https://images.unsplash.com/photo-1596142332133-327e2a0ff006?w=1200",
                "https://images.unsplash.com/photo-1769153998613-f3be8d6c3500?w=1200"
            ],
            "pricing": {
                "base_price": 280.0,
                "weekend_price": 350.0,
                "weekly_discount": 15,
                "monthly_discount": 25,
                "cleaning_fee": 80.0,
                "security_deposit": 300.0,
                "extra_guest_fee": 25.0
            },
            "seasons": [
                {"name": "Alta Stagione", "start_date": "2024-06-15", "end_date": "2024-09-15", "price_multiplier": 1.4}
            ],
            "extras": [
                {"id": str(uuid.uuid4()), "name_it": "Limoncello Welcome", "name_en": "Limoncello Welcome", "price": 20.0, "per_night": False}
            ],
            "min_nights": 2,
            "is_active": True,
            "average_rating": 4.8,
            "total_reviews": 45,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "slug": "trullo-valle-itria",
            "translations": {
                "it": {
                    "title": "Trullo Valle d'Itria",
                    "description": "Autentico trullo ristrutturato con piscina privata immerso negli ulivi secolari della Valle d'Itria.",
                    "area_description": "Tra Alberobello e Martina Franca, nel cuore della Puglia"
                },
                "en": {
                    "title": "Valle d'Itria Trullo",
                    "description": "Authentic restored trullo with private pool surrounded by centuries-old olive trees in Valle d'Itria.",
                    "area_description": "Between Alberobello and Martina Franca, in the heart of Puglia"
                }
            },
            "location": {
                "address": "Contrada Verzella 45",
                "city": "Locorotondo",
                "region": "Puglia",
                "country": "Italia",
                "lat": 40.7561,
                "lng": 17.3256
            },
            "amenities": ["pool", "wifi", "ac", "parking", "garden", "bbq", "outdoor_shower", "bikes"],
            "max_guests": 6,
            "bedrooms": 3,
            "bathrooms": 2,
            "images": [
                "https://images.unsplash.com/photo-1760139927409-7b6e98d53368?w=1200",
                "https://images.unsplash.com/photo-1760681554241-be45007dcea4?w=1200"
            ],
            "pricing": {
                "base_price": 320.0,
                "weekend_price": 380.0,
                "weekly_discount": 12,
                "monthly_discount": 22,
                "cleaning_fee": 100.0,
                "security_deposit": 400.0,
                "extra_guest_fee": 20.0
            },
            "seasons": [
                {"name": "Alta Stagione", "start_date": "2024-07-01", "end_date": "2024-08-31", "price_multiplier": 1.35}
            ],
            "extras": [
                {"id": str(uuid.uuid4()), "name_it": "Biciclette", "name_en": "Bicycles", "price": 15.0, "per_night": True},
                {"id": str(uuid.uuid4()), "name_it": "Cena Tipica", "name_en": "Traditional Dinner", "price": 80.0, "per_night": False}
            ],
            "min_nights": 2,
            "is_active": True,
            "average_rating": 4.95,
            "total_reviews": 32,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "slug": "chalet-dolomiti",
            "translations": {
                "it": {
                    "title": "Chalet Dolomiti",
                    "description": "Raffinato chalet alpino con spa privata e vista spettacolare sulle Dolomiti. Perfetto per sci e trekking.",
                    "area_description": "A Cortina d'Ampezzo, nel cuore delle Dolomiti UNESCO"
                },
                "en": {
                    "title": "Dolomites Chalet",
                    "description": "Refined alpine chalet with private spa and spectacular Dolomites views. Perfect for skiing and hiking.",
                    "area_description": "In Cortina d'Ampezzo, heart of the UNESCO Dolomites"
                }
            },
            "location": {
                "address": "Via Falzarego 112",
                "city": "Cortina d'Ampezzo",
                "region": "Veneto",
                "country": "Italia",
                "lat": 46.5405,
                "lng": 12.1357
            },
            "amenities": ["wifi", "ac", "parking", "fireplace", "sauna", "ski_storage", "mountain_view", "heated_floors"],
            "max_guests": 10,
            "bedrooms": 5,
            "bathrooms": 4,
            "images": [
                "https://images.unsplash.com/photo-1672226405717-697c84f48f9e?w=1200",
                "https://images.unsplash.com/photo-1678686425633-84fc103e2727?w=1200"
            ],
            "pricing": {
                "base_price": 680.0,
                "weekend_price": 800.0,
                "weekly_discount": 10,
                "monthly_discount": 18,
                "cleaning_fee": 200.0,
                "security_deposit": 800.0,
                "extra_guest_fee": 40.0
            },
            "seasons": [
                {"name": "Inverno Alta", "start_date": "2024-12-20", "end_date": "2025-01-06", "price_multiplier": 2.0},
                {"name": "Inverno", "start_date": "2024-12-01", "end_date": "2025-03-31", "price_multiplier": 1.5}
            ],
            "extras": [
                {"id": str(uuid.uuid4()), "name_it": "Skipass", "name_en": "Ski Pass", "price": 60.0, "per_night": True},
                {"id": str(uuid.uuid4()), "name_it": "Chef Privato", "name_en": "Private Chef", "price": 250.0, "per_night": False}
            ],
            "min_nights": 3,
            "is_active": True,
            "average_rating": 4.85,
            "total_reviews": 18,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "slug": "palazzo-toscano",
            "translations": {
                "it": {
                    "title": "Palazzo Toscano",
                    "description": "Storico palazzo rinascimentale nel centro di Firenze con affreschi originali e vista sul Duomo.",
                    "area_description": "A due passi da Piazza della Signoria e Ponte Vecchio"
                },
                "en": {
                    "title": "Tuscan Palace",
                    "description": "Historic Renaissance palace in central Florence with original frescoes and Duomo views.",
                    "area_description": "Steps from Piazza della Signoria and Ponte Vecchio"
                }
            },
            "location": {
                "address": "Via dei Calzaiuoli 18",
                "city": "Firenze",
                "region": "Toscana",
                "country": "Italia",
                "lat": 43.7696,
                "lng": 11.2558
            },
            "amenities": ["wifi", "ac", "elevator", "concierge", "city_view", "historic", "art_collection"],
            "max_guests": 6,
            "bedrooms": 3,
            "bathrooms": 2,
            "images": [
                "https://images.unsplash.com/photo-1724582586470-85422853ad61?w=1200",
                "https://images.unsplash.com/photo-1769153998613-f3be8d6c3500?w=1200"
            ],
            "pricing": {
                "base_price": 520.0,
                "weekend_price": 620.0,
                "weekly_discount": 8,
                "monthly_discount": 15,
                "cleaning_fee": 120.0,
                "security_deposit": 600.0,
                "extra_guest_fee": 35.0
            },
            "seasons": [
                {"name": "Alta Stagione", "start_date": "2024-04-01", "end_date": "2024-10-31", "price_multiplier": 1.3}
            ],
            "extras": [
                {"id": str(uuid.uuid4()), "name_it": "Guida Privata", "name_en": "Private Guide", "price": 180.0, "per_night": False},
                {"id": str(uuid.uuid4()), "name_it": "Wine Tour", "name_en": "Wine Tour", "price": 150.0, "per_night": False}
            ],
            "min_nights": 2,
            "is_active": True,
            "average_rating": 4.92,
            "total_reviews": 56,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.properties.insert_many(properties)
    
    return {"message": "Demo data seeded successfully", "properties_created": len(properties)}

# ============ ROOT ============

@api_router.get("/")
async def root():
    return {"message": "VacayStay API", "version": "1.0.0"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
