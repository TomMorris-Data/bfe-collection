"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-04-24
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "farms",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("client_ref", sa.String(50), unique=True, nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("contact_name", sa.String(200)),
        sa.Column("email", sa.String(200)),
        sa.Column("phone", sa.String(50)),
        sa.Column("enterprise_types", postgresql.ARRAY(sa.String), nullable=False, server_default="{}"),
        sa.Column("sbi_no", sa.String(50)),
        sa.Column("ahwp_agreement_no", sa.String(50)),
        sa.Column("active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_farms_client_ref", "farms", ["client_ref"])

    op.create_table(
        "check_in_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("farm_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("farms.id"), nullable=False),
        sa.Column("token", sa.String(64), unique=True, nullable=False),
        sa.Column("period_start", sa.Date, nullable=False),
        sa.Column("period_end", sa.Date, nullable=False),
        sa.Column("expires_at", sa.DateTime, nullable=False),
        sa.Column("first_accessed_at", sa.DateTime),
        sa.Column("completed_at", sa.DateTime),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_check_in_tokens_token", "check_in_tokens", ["token"])

    op.create_table(
        "check_in_responses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("farm_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("farms.id"), nullable=False),
        sa.Column("token_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("check_in_tokens.id"), nullable=False),
        sa.Column("period_start", sa.Date, nullable=False),
        sa.Column("section", sa.String(100), nullable=False),
        sa.Column("question_key", sa.String(100), nullable=False),
        sa.Column("value_num", sa.Numeric),
        sa.Column("value_text", sa.Text),
        sa.Column("value_option", sa.String(200)),
        sa.Column("submitted_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_check_in_responses_farm_period", "check_in_responses", ["farm_id", "period_start"])

    op.create_table(
        "seasonal_config",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("enterprise_type", sa.String(50), nullable=False),
        sa.Column("month", sa.Integer, nullable=False),
        sa.Column("section", sa.String(100), nullable=False),
        sa.Column("active", sa.Boolean, nullable=False, server_default="true"),
    )

    op.create_table(
        "benchmarks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("enterprise_type", sa.String(50), nullable=False),
        sa.Column("kpi_key", sa.String(100), nullable=False),
        sa.Column("display_name", sa.String(200), nullable=False),
        sa.Column("unit", sa.String(20), nullable=False, server_default="'%'"),
        sa.Column("red_below", sa.Numeric),
        sa.Column("amber_below", sa.Numeric),
        sa.Column("green_above", sa.Numeric),
        sa.Column("higher_is_better", sa.Boolean, nullable=False, server_default="true"),
    )


def downgrade() -> None:
    op.drop_table("benchmarks")
    op.drop_table("seasonal_config")
    op.drop_table("check_in_responses")
    op.drop_table("check_in_tokens")
    op.drop_table("farms")
