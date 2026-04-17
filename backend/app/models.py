from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum

# Enums are kept for static types like Priority, but Status becomes a table
class TicketPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"  # Platform owner
    ADMIN = "admin"              # Tenant admin
    AGENT = "agent"              # Support staff
    CLIENT = "client"            # End user

class TimelineEventType(str, enum.Enum):
    COMMENT = "comment"
    create = "create"  # Ticket created
    STATUS_CHANGE = "status_change"
    PRIORITY_CHANGE = "priority_change"
    ASSIGNMENT_CHANGE = "assignment_change"
    NOTE = "note"      # Internal note

class Tenant(Base):
    """
    Компания-клиент (Tenant) в SaaS системе.
    Вся информация изолируется по tenant_id.
    """
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)  # subdomain or unique id
    domain = Column(String, nullable=True)  # Custom domain
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)
    settings = Column(JSON, default={})  # Theme, logo, usage limits

    users = relationship("User", back_populates="tenant", cascade="all, delete-orphan")
    statuses = relationship("TicketStatus", back_populates="tenant", cascade="all, delete-orphan")
    companies = relationship("Company", back_populates="tenant", cascade="all, delete-orphan")

class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    name = Column(String, nullable=False)
    legal_name = Column(String, nullable=True)
    inn = Column(String, nullable=True)
    address = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    website = Column(String, nullable=True)
    logo_url = Column(String, nullable=True)
    domain = Column(String, nullable=True)
    industry = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    extra_metadata = Column("extra_metadata", JSON, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    tenant = relationship("Tenant", back_populates="companies")
    contacts = relationship("User", back_populates="company")
    tickets = relationship("Ticket", back_populates="company")
    subscriptions = relationship("CompanySubscription", back_populates="company", cascade="all, delete-orphan")
    employees = relationship("CompanyEmployee", back_populates="company", cascade="all, delete-orphan")

class CompanySubscription(Base):
    __tablename__ = "company_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    service_name = Column(String, nullable=False)
    plan = Column(String, nullable=True)
    license_count = Column(Integer, nullable=True)
    price = Column(String, nullable=True)
    currency = Column(String, default="UZS")
    billing_cycle = Column(String, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True, index=True)
    auto_renew = Column(Boolean, default=False)
    status = Column(String, default="active")
    notes = Column(Text, nullable=True)
    m365_tenant_id = Column(String, nullable=True)
    m365_domain = Column(String, nullable=True)
    admin_email = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    tenant = relationship("Tenant")
    company = relationship("Company", back_populates="subscriptions")

class CompanyEmployee(Base):
    __tablename__ = "company_employees"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    full_name = Column(String, nullable=False)
    position = Column(String, nullable=True)
    department = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    m365_license = Column(String, nullable=True)
    m365_email = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    tenant = relationship("Tenant")
    company = relationship("Company", back_populates="employees")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True) # Nullable only for Super Admins
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(String, default=UserRole.CLIENT)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    plain_password = Column(String, nullable=True) # For admin visibility as per request
    avatar_url = Column(String, nullable=True)
    is_available = Column(Boolean, default=True) # For Auto-routing
    telegram_chat_id = Column(String, nullable=True) # Link to TG User
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    tenant = relationship("Tenant", back_populates="users")
    company = relationship("Company", back_populates="contacts")
    
    created_tickets = relationship(
        "Ticket",
        foreign_keys="Ticket.created_by",
        back_populates="creator",
        cascade="all, delete-orphan"
    )
    assigned_tickets = relationship(
        "Ticket",
        foreign_keys="Ticket.assigned_to",
        back_populates="assignee"
    )
    timeline_events = relationship("TicketTimeline", back_populates="actor")

class TicketStatus(Base):
    """Настраиваемые статусы для каждого тенанта"""
    __tablename__ = "ticket_statuses"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    name = Column(String, nullable=False)
    color = Column(String, default="#808080")  # Hex color for badges
    order = Column(Integer, default=0)         # Kanban order
    is_final = Column(Boolean, default=False)  # Is closed state?

    tenant = relationship("Tenant", back_populates="statuses")
    tickets = relationship("Ticket", back_populates="status_rel")

class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    readable_id = Column(Integer, nullable=False)
    
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    
    status_id = Column(Integer, ForeignKey("ticket_statuses.id"), nullable=False)
    priority = Column(String, default=TicketPriority.MEDIUM, nullable=False)
    category = Column(String, nullable=True)
    tags = Column(JSON, default=[])
    
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    
    sla_due_at = Column(DateTime(timezone=True), nullable=True)
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    closed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    rating = Column(Integer, nullable=True)
    rating_comment = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    tenant = relationship("Tenant")
    status_rel = relationship("TicketStatus", back_populates="tickets")
    creator = relationship("User", foreign_keys=[created_by], back_populates="created_tickets")
    assignee = relationship("User", foreign_keys=[assigned_to], back_populates="assigned_tickets")
    closer = relationship("User", foreign_keys=[closed_by])
    resolver = relationship("User", foreign_keys=[resolved_by])
    company = relationship("Company", back_populates="tickets")
    
    timeline = relationship("TicketTimeline", back_populates="ticket", cascade="all, delete-orphan", order_by="TicketTimeline.created_at")
    attachments = relationship("Attachment", back_populates="ticket", cascade="all, delete-orphan")
    time_entries = relationship("TimeEntry", back_populates="ticket", cascade="all, delete-orphan")
    checklists = relationship("TicketChecklist", back_populates="ticket", cascade="all, delete-orphan", order_by="TicketChecklist.order")
    internal_notes = relationship("InternalNote", back_populates="ticket", cascade="all, delete-orphan", order_by="InternalNote.created_at.desc()")
    rating = relationship("TicketRating", back_populates="ticket", uselist=False)
    assets = relationship("CustomerAsset", secondary="ticket_assets", back_populates="tickets")

class Attachment(Base):
    """Вложения к тикетам"""
    __tablename__ = "attachments"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer)  # bytes
    mime_type = Column(String(100))
    
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    tenant = relationship("Tenant")
    ticket = relationship("Ticket", back_populates="attachments")
    uploader = relationship("User")

class TicketTimeline(Base):
    """
    Единая лента событий тикета: комментарии, смена статуса, заметки.
    Заменяет старую модель Comment.
    """
    __tablename__ = "ticket_timeline"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False) # Actor
    
    event_type = Column(String, default=TimelineEventType.COMMENT)
    content = Column(Text, nullable=True) # Message body or system text
    extra_metadata = Column("extra_metadata", JSON, default={}) # Diffs, e.g. {"old_status": "new", "new_status": "open"}
    
    is_internal = Column(Boolean, default=False) # True = Hidden from client
    created_at = Column(DateTime(timezone=True), server_default=func.now())


    ticket = relationship("Ticket", back_populates="timeline")
    actor = relationship("User", back_populates="timeline_events")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    link = Column(String, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="notifications")

class SLAPolicy(Base):
    __tablename__ = "sla_policies"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    name = Column(String, nullable=False)
    priority = Column(String, nullable=False) # e.g. "критичный"
    response_time_minutes = Column(Integer)
    resolution_time_minutes = Column(Integer)
    
    is_active = Column(Boolean, default=True)

    tenant = relationship("Tenant")

class TimeEntry(Base):
    __tablename__ = "time_entries"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Timer fields
    started_at = Column(DateTime(timezone=True), nullable=True)  # When timer was started
    ended_at = Column(DateTime(timezone=True), nullable=True)   # When timer was stopped
    minutes = Column(Integer, nullable=False, default=0)         # Calculated or manual
    description = Column(String)
    is_billable = Column(Boolean, default=True)                  # For billing reports
    is_running = Column(Boolean, default=False)                  # Active timer flag
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    ticket = relationship("Ticket", back_populates="time_entries")
    user = relationship("User")

class CannedResponse(Base):
    """Шаблоны быстрых ответов для агентов"""
    __tablename__ = "canned_responses"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    
    title = Column(String, nullable=False)           # "Перезагрузка"
    shortcut = Column(String, nullable=True)         # "/reboot" для быстрого поиска
    content = Column(Text, nullable=False)           # Текст ответа
    is_personal = Column(Boolean, default=False)     # Личный или общий
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    tenant = relationship("Tenant")
    creator = relationship("User")

class TicketChecklist(Base):
    """Чек-листы внутри тикета"""
    __tablename__ = "ticket_checklists"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    
    title = Column(String, nullable=False)           # "Диагностика сети"
    description = Column(Text, nullable=True)        # Описание шага
    is_completed = Column(Boolean, default=False)
    completed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    order = Column(Integer, default=0)               # Порядок выполнения
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    tenant = relationship("Tenant")
    ticket = relationship("Ticket", back_populates="checklists")
    user = relationship("User")

class TicketRating(Base):
    """CSAT оценки от клиентов после закрытия тикета"""
    __tablename__ = "ticket_ratings"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False, unique=True)
    
    rating = Column(Integer, nullable=False)         # 1-5 звезд
    comment = Column(Text, nullable=True)            # "Отличная работа!"
    is_public = Column(Boolean, default=False)       # Показывать ли в публичном рейтинге
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    tenant = relationship("Tenant")
    ticket = relationship("Ticket", back_populates="rating")

class InternalNote(Base):
    """Приватные заметки видные только агентам"""
    __tablename__ = "internal_notes"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    content = Column(Text, nullable=False)
    is_pinned = Column(Boolean, default=False)       # Закрепленная заметка
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    tenant = relationship("Tenant")
    ticket = relationship("Ticket", back_populates="internal_notes")
    user = relationship("User")

class AutomationRule(Base):
    """Правила автоматизации (триггеры и действия)"""
    __tablename__ = "automation_rules"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    order = Column(Integer, default=0)               # Порядок выполнения правил
    
    # Условия (JSON для гибкости)
    conditions = Column(JSON, default={})            # {"field": "priority", "operator": "equals", "value": "critical"}
    
    # Действия
    actions = Column(JSON, default={})               # {"action": "assign_agent", "value": 5}
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    tenant = relationship("Tenant")

class BusinessHours(Base):
    """Рабочие часы для расчета SLA"""
    __tablename__ = "business_hours"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    
    name = Column(String, nullable=False)            # "Стандартный график"
    timezone = Column(String, default="Asia/Tashkent")
    
    # Рабочие дни (JSON)
    schedule = Column(JSON, default={
        "monday": {"start": "09:00", "end": "18:00", "is_working": True},
        "tuesday": {"start": "09:00", "end": "18:00", "is_working": True},
        "wednesday": {"start": "09:00", "end": "18:00", "is_working": True},
        "thursday": {"start": "09:00", "end": "18:00", "is_working": True},
        "friday": {"start": "09:00", "end": "18:00", "is_working": True},
        "saturday": {"is_working": False},
        "sunday": {"is_working": False}
    })
    
    holidays = Column(JSON, default=[])              # ["2024-01-01", "2024-03-08"]
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    tenant = relationship("Tenant")

class CustomerAsset(Base):
    """Учет оборудования клиентов (ПК, серверы, принтеры)"""
    __tablename__ = "customer_assets"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    
    asset_type = Column(String, nullable=False)      # "computer", "server", "printer", "network"
    name = Column(String, nullable=False)            # "PC-001"
    model = Column(String, nullable=True)            # "Dell OptiPlex 7090"
    serial_number = Column(String, nullable=True)
    
    # Спецификации
    specifications = Column(JSON, default={})        # {"cpu": "i7", "ram": "16GB", "disk": "512GB SSD"}
    
    # Доступ
    remote_access_id = Column(String, nullable=True) # TeamViewer ID
    remote_access_password = Column(String, nullable=True)
    
    # Гарантия
    purchase_date = Column(DateTime(timezone=True), nullable=True)
    warranty_end = Column(DateTime(timezone=True), nullable=True)
    
    status = Column(String, default="active")        # "active", "repair", "retired"
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    location = Column(String, nullable=True)          # "Офис, этаж 3, каб. 305"
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    tenant = relationship("Tenant")
    company = relationship("Company")
    user = relationship("User")

class KBCategory(Base):
    __tablename__ = "kb_categories"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String)
    icon = Column(String, default="book")

    tenant = relationship("Tenant")
    articles = relationship("KBArticle", back_populates="category", cascade="all, delete-orphan")

class KBArticle(Base):
    __tablename__ = "kb_articles"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("kb_categories.id"), nullable=False)
    
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False) # HTML/Markdown
    
    is_published = Column(Boolean, default=True)
    view_count = Column(Integer, default=0)
    
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    tenant = relationship("Tenant")
    category = relationship("KBCategory", back_populates="articles")
    creator = relationship("User")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Null for system actions or failed logins
    
    action = Column(String(100), nullable=False) # e.g., TICKET_CREATE, USER_LOGIN_FAILED
    target_type = Column(String(50)) # e.g., ticket, user, company
    target_id = Column(Integer)
    
    details = Column(JSON) # JSON data about the change
    ip_address = Column(String(45))
    user_agent = Column(String(255))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    tenant = relationship("Tenant")
    user = relationship("User")

# Association table for Ticket <-> CustomerAsset
from sqlalchemy import Table
ticket_assets = Table(
    'ticket_assets',
    Base.metadata,
    Column('ticket_id', Integer, ForeignKey('tickets.id')),
    Column('asset_id', Integer, ForeignKey('customer_assets.id'))
)

# Add backrefs
User.notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
CustomerAsset.tickets = relationship("Ticket", secondary=ticket_assets, back_populates="assets")
