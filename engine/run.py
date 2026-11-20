import uvicorn
from app.core.config import settings

def main():
    print(f"==================================================")
    print(f"  {settings.APP_NAME} v{settings.VERSION}")
    print(f"  Words into Motion. Local-First Engine.")
    print(f"  Loopback host: {settings.HOST}:{settings.PORT}")
    print(f"  Session Token: {settings.SESSION_TOKEN}")
    print(f"==================================================")
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=False,
        log_level="info"
    )

if __name__ == "__main__":
    main()
