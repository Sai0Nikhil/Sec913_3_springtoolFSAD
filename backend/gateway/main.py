from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from controllers.init import *

app = FastAPI()

#Enable Cors
origins = ["http://localhost:5173"] #if you want to allow request from all then use "*"

app.add_middleware(
    CORSMiddleware,
    allow_origins = origins,   
    allow_credentials = True,
    allow_methods = ["*"],
    allow_headers = ["*"]
)

#Register all routes
app.include_router(AuthenticationRouter)

@app.get("/")
def home():
    return "Started...."