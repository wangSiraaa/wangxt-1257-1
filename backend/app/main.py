from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.api import auth, users, stores, vehicles
from app.api import disposal_factories, appointments, weighings
from app.api import routes as routes_api
from app.api import disposal_proofs, exceptions, settlements, dashboard

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="餐厨废油回收监管系统 API"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": settings.PROJECT_NAME, "version": "1.0.0"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


api_prefix = settings.API_V1_PREFIX
app.include_router(auth.router, prefix=api_prefix)
app.include_router(users.router, prefix=api_prefix)
app.include_router(stores.router, prefix=api_prefix)
app.include_router(vehicles.router, prefix=api_prefix)
app.include_router(disposal_factories.router, prefix=api_prefix)
app.include_router(appointments.router, prefix=api_prefix)
app.include_router(weighings.router, prefix=api_prefix)
app.include_router(routes_api.router, prefix=api_prefix)
app.include_router(disposal_proofs.router, prefix=api_prefix)
app.include_router(exceptions.router, prefix=api_prefix)
app.include_router(settlements.router, prefix=api_prefix)
app.include_router(dashboard.router, prefix=api_prefix)
