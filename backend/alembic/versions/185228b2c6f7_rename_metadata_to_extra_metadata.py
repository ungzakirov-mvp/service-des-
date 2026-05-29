"""rename_metadata_to_extra_metadata

Revision ID: 185228b2c6f7
Revises: 393ef8ac90d7
Create Date: 2026-04-14 00:05:56.922012

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '185228b2c6f7'
down_revision: Union[str, None] = '393ef8ac90d7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Guard: companies table may not exist on fresh DB (created by application code)
    conn = op.get_bind()
    if conn.dialect.name == 'sqlite':
        tables = [row[0] for row in conn.execute(sa.text("SELECT name FROM sqlite_master WHERE type='table'")).fetchall()]
    else:
        tables = [row[0] for row in conn.execute(sa.text("SELECT table_name FROM information_schema.tables")).fetchall()]
    if 'companies' in tables:
        # Use alter_column with new_column_name to preserve data
        op.alter_column('companies', 'metadata', new_column_name='extra_metadata')
    else:
        print("SKIP: companies table not found, skipping metadata rename")


def downgrade() -> None:
    # Use alter_column with new_column_name to revert
    op.alter_column('companies', 'extra_metadata', new_column_name='metadata')
