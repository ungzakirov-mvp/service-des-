from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models import TicketPriority, UserRole

# --- Tenant ---
class TenantBase(BaseModel):
    name: str
    slug: str
    domain: Optional[str] = None

class TenantCreate(TenantBase):
    pass

class TenantResponse(TenantBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

# --- CRM / Company ---
class CompanyBase(BaseModel):
    name: str
    legal_name: Optional[str] = None
    inn: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    domain: Optional[str] = None
    industry: Optional[str] = None
    description: Optional[str] = None

class CompanyCreate(CompanyBase):
    pass

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    legal_name: Optional[str] = None
    inn: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    domain: Optional[str] = None
    industry: Optional[str] = None
    description: Optional[str] = None

class CompanyResponse(CompanyBase):
    id: int
    tenant_id: int
    created_at: datetime
    subscriptions: Optional[List["CompanySubscriptionResponse"]] = None
    employees: Optional[List["CompanyEmployeeResponse"]] = None
    class Config:
        from_attributes = True
        populate_by_name = True

# --- Company Subscription ---
class CompanySubscriptionCreate(BaseModel):
    service_name: str
    plan: Optional[str] = None
    license_count: Optional[int] = None
    price: Optional[str] = None
    currency: Optional[str] = "UZS"
    billing_cycle: Optional[str] = None
    started_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    auto_renew: Optional[bool] = False
    status: Optional[str] = "active"
    notes: Optional[str] = None
    m365_tenant_id: Optional[str] = None
    m365_domain: Optional[str] = None
    admin_email: Optional[str] = None

class CompanySubscriptionUpdate(BaseModel):
    service_name: Optional[str] = None
    plan: Optional[str] = None
    license_count: Optional[int] = None
    price: Optional[str] = None
    currency: Optional[str] = None
    billing_cycle: Optional[str] = None
    started_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    auto_renew: Optional[bool] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    m365_tenant_id: Optional[str] = None
    m365_domain: Optional[str] = None
    admin_email: Optional[str] = None

class CompanySubscriptionResponse(BaseModel):
    id: int
    company_id: int
    service_name: str
    plan: Optional[str] = None
    license_count: Optional[int] = None
    price: Optional[str] = None
    currency: Optional[str] = "UZS"
    billing_cycle: Optional[str] = None
    started_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    auto_renew: Optional[bool] = False
    status: Optional[str] = "active"
    notes: Optional[str] = None
    m365_tenant_id: Optional[str] = None
    m365_domain: Optional[str] = None
    admin_email: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True

# --- Company Employee ---
class CompanyEmployeeCreate(BaseModel):
    full_name: str
    position: Optional[str] = None
    department: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    m365_license: Optional[str] = None
    m365_email: Optional[str] = None
    is_active: Optional[bool] = True
    notes: Optional[str] = None

class CompanyEmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    position: Optional[str] = None
    department: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    m365_license: Optional[str] = None
    m365_email: Optional[str] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None

class CompanyEmployeeResponse(BaseModel):
    id: int
    company_id: int
    full_name: str
    position: Optional[str] = None
    department: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    m365_license: Optional[str] = None
    m365_email: Optional[str] = None
    is_active: Optional[bool] = True
    notes: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True

# --- User ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: UserRole = UserRole.CLIENT

class UserCreate(UserBase):
    password: str
    company_id: Optional[int] = None

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    password: Optional[str] = None
    company_id: Optional[int] = None
    role: Optional[UserRole] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: int
    tenant_id: Optional[int]
    avatar_url: Optional[str] = None
    company_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

class UserAdminResponse(UserResponse):
    plain_password: Optional[str] = None
    company: Optional[CompanyResponse] = None

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

# --- Ticket Status ---
class TicketStatusBase(BaseModel):
    name: str
    color: str
    order: int
    is_final: bool = False

class TicketStatusResponse(TicketStatusBase):
    id: int
    class Config:
        from_attributes = True

# --- Ticket ---
class TicketCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: TicketPriority = TicketPriority.MEDIUM
    company_id: Optional[int] = None
    tags: Optional[List[str]] = []
    scheduled_at: Optional[datetime] = None
    assigned_to: Optional[int] = None

class TicketUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status_id: Optional[int] = None
    priority: Optional[TicketPriority] = None
    assigned_to: Optional[int] = None
    company_id: Optional[int] = None
    tags: Optional[List[str]] = None

# --- Attachments ---
class AttachmentResponse(BaseModel):
    id: int
    filename: str
    file_size: int
    mime_type: Optional[str]
    file_path: Optional[str]
    url: Optional[str]
    created_at: datetime
    uploaded_by: int
    
    class Config:
        from_attributes = True

class TicketRating(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None

class TicketResponse(BaseModel):
    id: int
    readable_id: int
    tenant_id: int
    title: str
    description: Optional[str]
    status_id: int
    priority: TicketPriority
    created_by: int
    assigned_to: Optional[int]
    category: Optional[str] = None
    tags: Optional[List[str]] = []
    created_at: datetime
    updated_at: Optional[datetime]
    sla_due_at: Optional[datetime] = None
    scheduled_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[int] = None
    closed_by: Optional[int] = None
    company_id: Optional[int] = None
    
    rating: Optional[int] = None
    rating_comment: Optional[str] = None
    
    status: Optional[TicketStatusResponse] = Field(None, alias="status_rel") 
    creator: Optional[UserResponse] = None
    assignee: Optional[UserResponse] = None
    closer: Optional[UserResponse] = None
    resolver: Optional[UserResponse] = None
    company: Optional[CompanyResponse] = None
    attachments: Optional[List[AttachmentResponse]] = []

    class Config:
        from_attributes = True

class TicketDetailResponse(TicketResponse):
    pass

# --- Timeline ---
class TimelineEventResponse(BaseModel):
    id: int
    ticket_id: int
    user_id: int
    event_type: str
    content: Optional[str] = None
    event_metadata: Optional[Dict[str, Any]] = Field(default={})
    is_internal: bool = False
    created_at: datetime
    
    # Nested actor
    actor: Optional[UserResponse] = None

    class Config:
        from_attributes = True

# --- Notifications ---
class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    link: Optional[str]
    is_read: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# --- SLA Policies ---
class SLAPolicyBase(BaseModel):
    name: str
    priority: str
    response_time_minutes: Optional[int] = None
    resolution_time_minutes: Optional[int] = None
    is_active: bool = True

class SLAPolicyCreate(SLAPolicyBase):
    pass

class SLAPolicyResponse(SLAPolicyBase):
    id: int
    tenant_id: int
    
    class Config:
        from_attributes = True

# --- Time Tracking ---
class TimeEntryBase(BaseModel):
    ticket_id: int
    minutes: int
    description: Optional[str] = None

class TimeEntryCreate(TimeEntryBase):
    pass

class TimeEntryResponse(TimeEntryBase):
    id: int
    user_id: int
    created_at: datetime
    
    # Nested user for response
    user: Optional[UserResponse] = None

    class Config:
        from_attributes = True

    class Config:
        from_attributes = True

# --- Knowledge Base ---
class KBCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = "book"

class KBCategoryCreate(KBCategoryBase):
    pass

class KBCategoryResponse(KBCategoryBase):
    id: int
    tenant_id: int
    
    class Config:
        from_attributes = True

class KBArticleBase(BaseModel):
    category_id: int
    title: str
    content: str
    is_published: bool = True

class KBArticleCreate(KBArticleBase):
    pass

class KBArticleResponse(KBArticleBase):
    id: int
    tenant_id: int
    view_count: int
    created_at: datetime
    updated_at: Optional[datetime]
    
    # Optional nested
    category: Optional[KBCategoryResponse] = None
    creator: Optional[UserResponse] = None

    class Config:
        from_attributes = True

# --- Audit Logging ---

# --- Audit Logging ---
class AuditLogResponse(BaseModel):
    id: int
    action: str
    target_type: Optional[str]
    target_id: Optional[int]
    details: Optional[dict]
    ip_address: Optional[str]
    created_at: datetime
    
    # Optional nested
    user: Optional[UserResponse] = None

    class Config:
        from_attributes = True

# --- Analytics ---
class VolumeTrend(BaseModel):
    date: str
    count: int

class AgentPerformance(BaseModel):
    agent_id: int
    full_name: Optional[str]
    resolved_count: int
    avg_resolution_hours: Optional[float]
    sla_compliance_rate: Optional[float] = None

class RequesterPerformance(BaseModel):
    user_id: int
    full_name: Optional[str]
    ticket_count: int

class StatusDistribution(BaseModel):
    status_name: str
    count: int
    color: str

class TaskDeadline(BaseModel):
    ticket_id: int
    title: str
    due_at: datetime
    status_name: str
    priority: str

class AnalyticsResponse(BaseModel):
    volume_trends: List[VolumeTrend]
    agent_performance: List[AgentPerformance]
    requester_performance: List[RequesterPerformance]
    status_distribution: List[StatusDistribution]
    upcoming_deadlines: List[TaskDeadline]
    total_tickets: int
    active_users: int


# ============================================================================
# TIME TRACKING
# ============================================================================
class TimeEntryBase(BaseModel):
    description: Optional[str] = None
    is_billable: bool = True

class TimeEntryCreate(TimeEntryBase):
    ticket_id: int

class TimeEntryUpdate(BaseModel):
    description: Optional[str] = None
    minutes: Optional[int] = None
    is_billable: Optional[bool] = None

class TimeEntryResponse(TimeEntryBase):
    id: int
    ticket_id: int
    user_id: int
    user_name: Optional[str] = None
    minutes: int
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    is_running: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class TimeEntryStart(BaseModel):
    ticket_id: int
    description: Optional[str] = None

class TimerStatus(BaseModel):
    is_running: bool
    current_entry: Optional[TimeEntryResponse] = None
    total_today_minutes: int = 0


# ============================================================================
# CANNED RESPONSES
# ============================================================================
class CannedResponseBase(BaseModel):
    title: str
    shortcut: Optional[str] = None
    content: str
    is_personal: bool = False

class CannedResponseCreate(CannedResponseBase):
    pass

class CannedResponseUpdate(BaseModel):
    title: Optional[str] = None
    shortcut: Optional[str] = None
    content: Optional[str] = None
    is_personal: Optional[bool] = None

class CannedResponseResponse(CannedResponseBase):
    id: int
    created_by: int
    created_by_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# ============================================================================
# TICKET CHECKLISTS
# ============================================================================
class TicketChecklistBase(BaseModel):
    title: str
    description: Optional[str] = None
    order: int = 0

class TicketChecklistCreate(TicketChecklistBase):
    ticket_id: int

class TicketChecklistUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    is_completed: Optional[bool] = None
    order: Optional[int] = None

class TicketChecklistResponse(TicketChecklistBase):
    id: int
    ticket_id: int
    is_completed: bool
    completed_by: Optional[int] = None
    completed_by_name: Optional[str] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============================================================================
# TICKET RATINGS (CSAT)
# ============================================================================
class TicketRatingCreate(BaseModel):
    ticket_id: int
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None
    is_public: bool = False

class TicketRatingResponse(BaseModel):
    id: int
    ticket_id: int
    rating: int
    comment: Optional[str] = None
    is_public: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============================================================================
# INTERNAL NOTES
# ============================================================================
class InternalNoteBase(BaseModel):
    content: str
    is_pinned: bool = False

class InternalNoteCreate(InternalNoteBase):
    ticket_id: int

class InternalNoteUpdate(BaseModel):
    content: Optional[str] = None
    is_pinned: Optional[bool] = None

class InternalNoteResponse(InternalNoteBase):
    id: int
    ticket_id: int
    user_id: int
    user_name: Optional[str] = None
    user_avatar: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# ============================================================================
# AUTOMATION RULES
# ============================================================================
class AutomationRuleBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True
    order: int = 0
    conditions: Dict[str, Any] = {}
    actions: Dict[str, Any] = {}

class AutomationRuleCreate(AutomationRuleBase):
    pass

class AutomationRuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    order: Optional[int] = None
    conditions: Optional[Dict[str, Any]] = None
    actions: Optional[Dict[str, Any]] = None

class AutomationRuleResponse(AutomationRuleBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# ============================================================================
# BUSINESS HOURS
# ============================================================================
class BusinessHoursBase(BaseModel):
    name: str
    timezone: str = "Asia/Tashkent"
    schedule: Dict[str, Any] = {}
    holidays: List[str] = []

class BusinessHoursCreate(BusinessHoursBase):
    pass

class BusinessHoursUpdate(BaseModel):
    name: Optional[str] = None
    timezone: Optional[str] = None
    schedule: Optional[Dict[str, Any]] = None
    holidays: Optional[List[str]] = None

class BusinessHoursResponse(BusinessHoursBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============================================================================
# CUSTOMER ASSETS
# ============================================================================
class CustomerAssetBase(BaseModel):
    asset_type: str  # computer, server, printer, network
    name: str
    model: Optional[str] = None
    serial_number: Optional[str] = None
    specifications: Dict[str, Any] = {}
    remote_access_id: Optional[str] = None
    remote_access_password: Optional[str] = None
    purchase_date: Optional[datetime] = None
    warranty_end: Optional[datetime] = None
    status: str = "active"
    assigned_to: Optional[int] = None
    location: Optional[str] = None
    notes: Optional[str] = None

class CustomerAssetCreate(CustomerAssetBase):
    company_id: int

class CustomerAssetUpdate(BaseModel):
    asset_type: Optional[str] = None
    name: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    specifications: Optional[Dict[str, Any]] = None
    remote_access_id: Optional[str] = None
    remote_access_password: Optional[str] = None
    purchase_date: Optional[datetime] = None
    warranty_end: Optional[datetime] = None
    status: Optional[str] = None
    assigned_to: Optional[int] = None
    location: Optional[str] = None
    notes: Optional[str] = None

class CustomerAssetResponse(CustomerAssetBase):
    id: int
    company_id: int
    company_name: Optional[str] = None
    assigned_user_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    ticket_count: int = 0
    
    class Config:
        from_attributes = True

# --- Reports ---
class ReportResponse(BaseModel):
    type: str
    period: str
    total: int
    resolved: int
    data: List[Dict[str, Any]] = []
    summary: Dict[str, Any] = {}
    
    class Config:
        from_attributes = True
