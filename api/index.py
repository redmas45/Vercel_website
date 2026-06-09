from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(title="FastAPI Vercel App")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {
        "status": "ok",
        "message": "FastAPI is running on Vercel",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/api/example")
def example():
    return {
        "name": "FastAPI Boilerplate",
        "deployed_on": "Vercel",
    }
