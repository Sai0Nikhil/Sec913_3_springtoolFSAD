from fastapi import APIRouter, Header
from models.schemas import SigninSchema, SignupSchema
import httpx

router = APIRouter(prefix="/authservice")

SPRING_URL = "http://localhost:8001/"

@router.post("/signup")
async def signup(U: SignupSchema):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            SPRING_URL + "user/signup",
            json=U.model_dump()   # Send data to Spring
        )
    return response.json() # Returs back the response received from spring

@router.post("/signin")
async def signin(U: SigninSchema):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            SPRING_URL + "user/signin",
            json=U.model_dump()
        )
    return response.json()


@router.get("/uinfo")
async def uinfo(Token: str = Header(...)):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            SPRING_URL + "user/uinfo",
            headers = {"Token": Token}
        )
    return response.json()