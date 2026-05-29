from pydantic import BaseModel
from typing import Optional, List


class SubscribeRequest(BaseModel):
    tariff_id: int


class ServiceItemReq(BaseModel):
    service_id: int
    quantity: int = 1


class ServiceRequestCreate(BaseModel):
    items: List[ServiceItemReq]
    notes: Optional[str] = None


class FeatureItem(BaseModel):
    text_ru: str
    text_en: str
    text_uz: str
    is_included: bool = True


class PlanCreate(BaseModel):
    name_ru: str
    name_en: str
    name_uz: str
    slug: str
    price_monthly: int
    max_workstations: Optional[int] = None
    description_ru: Optional[str] = None
    description_en: Optional[str] = None
    description_uz: Optional[str] = None
    is_popular: bool = False
    sort_order: int = 0


class PlanUpdate(BaseModel):
    name_ru: Optional[str] = None
    name_en: Optional[str] = None
    name_uz: Optional[str] = None
    price_monthly: Optional[int] = None
    is_popular: Optional[bool] = None
    sort_order: Optional[int] = None
