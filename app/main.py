from fastapi import FastAPI
from app.class_summary import get_class_summary

app = FastAPI()

@app.get("/api/class_summary/{class_id}")
def api_class_summary(class_id: str):
    return get_class_summary(class_id)
