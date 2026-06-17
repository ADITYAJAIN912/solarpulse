from fastapi import FastAPI

app = FastAPI(
    title="SolarPulse",
    description="AI-powered solar plant performance monitoring API",
    version="0.1.0",
)


@app.get("/")
def health_check() -> dict[str, str]:
    """Health check endpoint to verify the API is running."""
    return {"status": "ok"}
