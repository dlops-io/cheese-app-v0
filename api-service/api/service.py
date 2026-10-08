
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from fastapi import File
from fastapi.responses import RedirectResponse

from api.routers import rag

# Setup FastAPI app
app = FastAPI(title="API Server", description="API Server", version="v1")


# Enable CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    print("Startup tasks")
    

# Routes
@app.get("/")
async def get_index():
    #return RedirectResponse(url="/docs")
    return {"message": "Welcome to the API Service"}

# Additional routers here
app.include_router(rag.router, prefix="/rag")