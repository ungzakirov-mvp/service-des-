import os
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.routers import auth, tickets, comments, notifications, webhooks, analytics, users, crm, timetracking, audit, features, reports, assets, company_dashboard, monitoring, dashboard_hud, dashboard_v2, organizations, tariffs
from app.config import settings
from app.logger import log_request, setup_logging
from app.services.websocket_manager import manager
from app.database import engine, Base
from jose import jwt
import time
import asyncio
from contextlib import asynccontextmanager

# Initialize logging
setup_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables if not exist
    try:
        # Register tariff models so tables are created
        import app.models_tariffs  # noqa: F401
        Base.metadata.create_all(bind=engine)
        print("Database tables initialized.")
        
        # Add missing columns for existing databases
        from sqlalchemy import inspect, text
        with engine.connect() as conn:
            insp = inspect(engine)
            
            if 'companies' in insp.get_table_names():
                existing_cols = [c['name'] for c in insp.get_columns('companies')]
                new_cols = {
                    'legal_name': 'VARCHAR',
                    'inn': 'VARCHAR',
                    'address': 'VARCHAR',
                    'phone': 'VARCHAR',
                    'email': 'VARCHAR',
                    'website': 'VARCHAR',
                    'logo_url': 'VARCHAR',
                    'description': 'TEXT',
                }
                for col_name, col_type in new_cols.items():
                    if col_name not in existing_cols:
                        conn.execute(text(f'ALTER TABLE companies ADD COLUMN {col_name} {col_type}'))
                        print(f"Added '{col_name}' column to companies")
                if 'color' not in existing_cols:
                    conn.execute(text("ALTER TABLE companies ADD COLUMN color VARCHAR DEFAULT '#0066CC'"))
                    print("Added 'color' column to companies")
                conn.commit()
            
            if 'tickets' in insp.get_table_names():
                ticket_cols = [c['name'] for c in insp.get_columns('tickets')]
                ticket_new = {
                    'scheduled_at': 'TIMESTAMP WITH TIME ZONE',
                    'accepted_at': 'TIMESTAMP WITH TIME ZONE',
                    'closed_by': 'INTEGER',
                }
                for col_name, col_type in ticket_new.items():
                    if col_name not in ticket_cols:
                        conn.execute(text(f'ALTER TABLE tickets ADD COLUMN {col_name} {col_type}'))
                        print(f"Added '{col_name}' column to tickets")
                conn.commit()
            
            if 'users' in insp.get_table_names():
                user_cols = [c['name'] for c in insp.get_columns('users')]
                if 'anudesk_email' not in user_cols:
                    conn.execute(text('ALTER TABLE users ADD COLUMN anudesk_email VARCHAR'))
                    print("Added 'anudesk_email' column to users")
                conn.commit()

            # Migration for time_entries table - add new columns
            if 'time_entries' in insp.get_table_names():
                time_cols = [c['name'] for c in insp.get_columns('time_entries')]
                time_new = {
                    'started_at': 'TIMESTAMP WITH TIME ZONE',
                    'ended_at': 'TIMESTAMP WITH TIME ZONE',
                    'is_billable': 'BOOLEAN DEFAULT TRUE',
                    'is_running': 'BOOLEAN DEFAULT FALSE',
                }
                for col_name, col_type in time_new.items():
                    if col_name not in time_cols:
                        conn.execute(text(f'ALTER TABLE time_entries ADD COLUMN {col_name} {col_type}'))
                        print(f"Added '{col_name}' column to time_entries")
                conn.commit()
    except Exception as e:
        print(f"Database initialization error: {e}")
        
    # Start Telegram bot polling as task
    from app.telegram_bot import start_polling
    bot_task = asyncio.create_task(start_polling())
    
    # Start IMAP email polling as task
    from app.services.imap_service import imap_polling_loop
    imap_task = asyncio.create_task(imap_polling_loop())
    
    yield # App runs here
    
    # Shutdown
    bot_task.cancel()
    imap_task.cancel()

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="Production-ready Service Desk / Help Desk backend",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploads
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(os.path.join(STATIC_DIR, "logos"), exist_ok=True)
app.mount("/api/static", StaticFiles(directory=STATIC_DIR), name="static")

# Logging middleware
@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    log_request(
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        duration=process_time
    )
    
    return response

# Register routers
app.include_router(auth.router, prefix="/api")
app.include_router(tickets.router, prefix="/api")
app.include_router(comments.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(webhooks.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(crm.router, prefix="/api")
app.include_router(timetracking.router, prefix="/api")
app.include_router(audit.router, prefix="/api")
app.include_router(company_dashboard.router, prefix="/api")
app.include_router(monitoring.router, prefix="/api")
app.include_router(features.router, prefix="")
app.include_router(assets.router, prefix="")
app.include_router(reports.router, prefix="/api")
app.include_router(dashboard_hud.router, prefix="/api")
app.include_router(dashboard_v2.router, prefix="/api")
app.include_router(organizations.router, prefix="/api")
app.include_router(tariffs.router, prefix="/api")


# Health check
@app.get("/", tags=["Health"])
def health_check():
    return {
        "status": "running",
        "version": "2.0.0",
        "message": "Service Desk API ready"
    }


# Stats (for dashboard)
from fastapi import Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models import Ticket, TicketStatus, User
# models_tariffs imported in lifespan to register tables


@app.get("/api/stats", tags=["Statistics"])
def get_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    base_query = db.query(Ticket).filter(Ticket.tenant_id == current_user.tenant_id)
    
    total_tickets = base_query.count()
    
    def count_by_status(name):
        return base_query.join(TicketStatus).filter(TicketStatus.name == name).count()
        
    new_tickets = count_by_status("Новый")
    in_progress = count_by_status("В работе")
    resolved = count_by_status("Ожидает клиента")
    closed = count_by_status("Закрыт")
    
    my_tickets = base_query.filter(Ticket.assigned_to == current_user.id).count()
    my_created = base_query.filter(Ticket.created_by == current_user.id).count()
    
    return {
        "total_tickets": total_tickets,
        "new_tickets": new_tickets,
        "in_progress": in_progress,
        "resolved": resolved,
        "closed": closed,
        "assigned_to_me": my_tickets,
        "created_by_me": my_created
    }

# WebSocket endpoint
@app.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id_str: str = payload.get("sub")
        tenant_id: int = payload.get("tenant_id")
        
        if user_id_str is None or tenant_id is None:
            await websocket.close(code=1008)
            return
            
        user_id = int(user_id_str)
        
        await manager.connect(websocket, tenant_id, user_id)
        
        try:
            while True:
                data = await websocket.receive_text()
        except WebSocketDisconnect:
            manager.disconnect(websocket, tenant_id, user_id)
            
    except Exception as e:
        print(f"WS Auth Error: {e}")
        await websocket.close(code=1008)
