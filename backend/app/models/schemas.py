from pydantic import BaseModel


class Dimensions(BaseModel):
    width: int
    height: int


class UploadResponse(BaseModel):
    uuid: str
    dimensions: Dimensions
    url: str
