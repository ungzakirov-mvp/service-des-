import os
import sys

# Добавляем путь к backend, чтобы импорты app.* работали
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base, SessionLocal
from app.models import Tenant, TicketStatus, User, UserRole, Company, Ticket, TicketTimeline, TicketPriority, TimelineEventType
from app.security import hash_password

# Создаем все таблицы
Base.metadata.create_all(bind=engine)
db = SessionLocal()

try:
    # 1. Создаем Tenant (Организацию-владельца Service Desk)
    tenant = db.query(Tenant).filter(Tenant.slug == "novum").first()
    if not tenant:
        tenant = Tenant(name="Novum Tech", slug="novum", domain="novumtech.uz", is_active=True)
        db.add(tenant)
        db.commit()
        db.refresh(tenant)

    # 2. Создаем базовые статусы (Workflow: Новый -> В работе -> Ожидает клиента -> Закрыт)
    existing_statuses = db.query(TicketStatus).filter(TicketStatus.tenant_id == tenant.id).count()
    if existing_statuses == 0:
        # Clean slate - create proper workflow statuses
        db.add_all([
            TicketStatus(tenant_id=tenant.id, name="Новый", color="#3b82f6", order=1),
            TicketStatus(tenant_id=tenant.id, name="В работе", color="#f59e0b", order=2),
            TicketStatus(tenant_id=tenant.id, name="Ожидает клиента", color="#8b5cf6", order=3),
            TicketStatus(tenant_id=tenant.id, name="Закрыт", color="#6b7280", order=4, is_final=True),
        ])
        db.commit()
    else:
        # Update existing statuses to match new workflow
        new_status = db.query(TicketStatus).filter(
            TicketStatus.tenant_id == tenant.id,
            TicketStatus.name == "Новый"
        ).first()
        if new_status:
            new_status.order = 1
        
        in_progress = db.query(TicketStatus).filter(
            TicketStatus.tenant_id == tenant.id,
            TicketStatus.name == "В работе"
        ).first()
        if in_progress:
            in_progress.order = 2
        
        # Check if "Ожидает клиента" exists, if not create it
        awaiting = db.query(TicketStatus).filter(
            TicketStatus.tenant_id == tenant.id,
            TicketStatus.name == "Ожидает клиента"
        ).first()
        if not awaiting:
            awaiting = TicketStatus(tenant_id=tenant.id, name="Ожидает клиента", color="#8b5cf6", order=3)
            db.add(awaiting)
        
        # Delete old statuses if they exist
        old_resolved = db.query(TicketStatus).filter(
            TicketStatus.tenant_id == tenant.id,
            TicketStatus.name == "Решён"
        ).first()
        if old_resolved:
            db.delete(old_resolved)
        
        old_closed = db.query(TicketStatus).filter(
            TicketStatus.tenant_id == tenant.id,
            TicketStatus.name == "Закрыт"
        ).first()
        if old_closed:
            old_closed.order = 4
            old_closed.is_final = True
        
        db.commit()

    # 3. Создаем базовую компанию-клиента
    company = db.query(Company).filter(Company.name == "Test Client Corp").first()
    if not company:
        company = Company(tenant_id=tenant.id, name="Test Client Corp", industry="IT", description="Тестовая компания для проверки")
        db.add(company)
        db.commit()
        db.refresh(company)

    # 4. Создаем 3-х пользователей (Админ, Агент, Клиент)
    if db.query(User).count() == 0:
        admin = User(tenant_id=tenant.id, email="admin@novumtech.uz", password=hash_password("admin123"),
                     plain_password="admin123", full_name="Super Admin", role=UserRole.ADMIN)
        agent = User(tenant_id=tenant.id, email="agent@novumtech.uz", password=hash_password("agent123"),
                     plain_password="agent123", full_name="Support Agent", role=UserRole.AGENT, is_available=True)
        client = User(tenant_id=tenant.id, email="client@test.com", password=hash_password("client123"),
                      plain_password="client123", full_name="John Doe", role=UserRole.CLIENT, company_id=company.id)
        
        db.add_all([admin, agent, client])
        db.commit()
        db.refresh(client)
        db.refresh(agent)
        
        # 5. Создаем один тестовый тикет
        status = db.query(TicketStatus).filter(TicketStatus.name == "Новый").first()
        ticket = Ticket(
            tenant_id=tenant.id,
            readable_id=1001,
            title="Не работает интернет в офисе",
            description="Здравствуйте, у нас пропал интернет, срочно нужна помощь!",
            status_id=status.id,
            priority=TicketPriority.HIGH,
            created_by=client.id,
            company_id=company.id
        )
        db.add(ticket)
        db.commit()
        db.refresh(ticket)
        
        # Добавляем Timeline Event для тикета (как будто это первое сообщение)
        event = TicketTimeline(
            ticket_id=ticket.id,
            user_id=client.id,
            event_type=TimelineEventType.COMMENT,
            content=ticket.description
        )
        db.add(event)
        db.commit()

    print("Database seeded successfully with test data!")
except Exception as e:
    print(f"Error seeding database: {e}")
finally:
    db.close()
