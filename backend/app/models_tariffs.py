from sqlalchemy import Column, Integer, String, Text, Boolean, BigInteger, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class TariffPlan(Base):
    __tablename__ = "tariff_plans"

    id = Column(Integer, primary_key=True, index=True)
    name_ru = Column(String(100), nullable=False)
    name_en = Column(String(100), nullable=False)
    name_uz = Column(String(100), nullable=False)
    slug = Column(String(50), unique=True, nullable=False)
    price_monthly = Column(BigInteger, nullable=False)
    max_workstations = Column(Integer, nullable=True)
    description_ru = Column(Text, nullable=True)
    description_en = Column(Text, nullable=True)
    description_uz = Column(Text, nullable=True)
    is_popular = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    features = relationship("TariffFeature", back_populates="tariff", cascade="all, delete-orphan", order_by="TariffFeature.sort_order")


class TariffFeature(Base):
    __tablename__ = "tariff_features"

    id = Column(Integer, primary_key=True, index=True)
    tariff_id = Column(Integer, ForeignKey("tariff_plans.id", ondelete="CASCADE"), nullable=False)
    text_ru = Column(String(255), nullable=False)
    text_en = Column(String(255), nullable=False)
    text_uz = Column(String(255), nullable=False)
    is_included = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)

    tariff = relationship("TariffPlan", back_populates="features")


class OrgSubscription(Base):
    __tablename__ = "org_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    tariff_id = Column(Integer, ForeignKey("tariff_plans.id", ondelete="RESTRICT"), nullable=False)
    status = Column(String(20), default="active")
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    tenant = relationship("Tenant")
    tariff = relationship("TariffPlan")


class ServiceCatalog(Base):
    __tablename__ = "service_catalog"

    id = Column(Integer, primary_key=True, index=True)
    name_ru = Column(String(255), nullable=False)
    name_en = Column(String(255), nullable=False)
    name_uz = Column(String(255), nullable=False)
    description_ru = Column(Text, nullable=True)
    description_en = Column(Text, nullable=True)
    description_uz = Column(Text, nullable=True)
    price = Column(BigInteger, nullable=False)
    price_unit_ru = Column(String(50), nullable=False)
    price_unit_en = Column(String(50), nullable=False)
    price_unit_uz = Column(String(50), nullable=False)
    price_type = Column(String(20), default="monthly")
    is_quantifiable = Column(Boolean, default=True)
    min_quantity = Column(Integer, default=1)
    max_quantity = Column(Integer, default=999)
    category = Column(String(50), nullable=True)
    icon_name = Column(String(50), nullable=True)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ServiceRequest(Base):
    __tablename__ = "service_requests"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    requested_by = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    status = Column(String(20), default="pending")
    total_monthly = Column(BigInteger, nullable=True)
    total_one_time = Column(BigInteger, nullable=True)
    notes = Column(Text, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    items = relationship("ServiceRequestItem", back_populates="request", cascade="all, delete-orphan")
    requester = relationship("User", foreign_keys=[requested_by])
    reviewer = relationship("User", foreign_keys=[reviewed_by])


class ServiceRequestItem(Base):
    __tablename__ = "service_request_items"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("service_requests.id", ondelete="CASCADE"), nullable=False)
    service_id = Column(Integer, ForeignKey("service_catalog.id", ondelete="RESTRICT"), nullable=False)
    quantity = Column(Integer, default=1)
    unit_price = Column(BigInteger, nullable=False)
    subtotal = Column(BigInteger, nullable=False)

    request = relationship("ServiceRequest", back_populates="items")
    service = relationship("ServiceCatalog")
