"""
Database initialization script.
Creates all tables and seeds sample data.
"""

import os
import sys
from datetime import datetime, timedelta
from uuid import uuid4
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

env_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from db.models import Base, User, Milestone, Session

POSTGRES_USER = os.getenv("POSTGRES_USER", "pfe")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "pfe_secret")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
POSTGRES_DB = os.getenv("POSTGRES_DB", "pfe_coach")

DATABASE_URL = os.getenv("DATABASE_URL", f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)


def init_database():
    """Create all tables and seed sample data."""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully.")

    db = SessionLocal()
    try:
        existing_student = db.query(User).first()
        if existing_student:
            print("Database already has data. Skipping seed.")
            return

        print("Seeding sample data...")

        user_id = str(uuid4())
        student = User(
            id=user_id,
            display_name="Ahmed Benali",
            email="ahmed.benali@university.edu"
        )
        db.add(student)
        db.flush()

        today = datetime.utcnow()
        milestones = [
            Milestone(
                id=str(uuid4()),
                user_id=user_id,
                title="Project Proposal",
                description="Submit initial project proposal with objectives and methodology",
                due_date=today - timedelta(days=30),
                completed=True,
                completed_at=today - timedelta(days=25)
            ),
            Milestone(
                id=str(uuid4()),
                user_id=user_id,
                title="Literature Review",
                description="Complete comprehensive literature review of at least 20 sources",
                due_date=today - timedelta(days=10),
                completed=True,
                completed_at=today - timedelta(days=5)
            ),
            Milestone(
                id=str(uuid4()),
                user_id=user_id,
                title="System Design",
                description="Complete system architecture and design documents",
                due_date=today + timedelta(days=10),
                completed=False
            ),
            Milestone(
                id=str(uuid4()),
                user_id=user_id,
                title="Implementation",
                description="Implement core system functionality",
                due_date=today + timedelta(days=30),
                completed=False
            ),
            Milestone(
                id=str(uuid4()),
                user_id=user_id,
                title="Final Report",
                description="Submit complete final report and defend project",
                due_date=today + timedelta(days=60),
                completed=False
            )
        ]
        for milestone in milestones:
            db.add(milestone)

        session_id = str(uuid4())
        session = Session(
            id=session_id,
            user_id=user_id,
            created_at=datetime.utcnow()
        )
        db.add(session)

        db.commit()
        print(f"Sample student created: {student.display_name} (ID: {user_id})")
        print(f"Default session ID: {session_id}")
        print("Database seeded successfully!")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    init_database()