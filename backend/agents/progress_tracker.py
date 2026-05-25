"""
Progress Tracker agent for answering milestone and deadline questions.
"""

import os
from typing import TypedDict
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from config import llm
from db.models import Milestone

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://pfe:pfe_secret@localhost:5433/pfe_coach")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)


SYSTEM_PROMPT = """You are a progress tracker assistant for a student's final-year project.
Use the provided milestone data to answer the student's questions.
Never make up deadlines - only use data from the database.
Be helpful and concise. If there are no milestones, say so.

Respond in the same language the student used (French or English)."""


def progress_tracker_node(state: TypedDict) -> TypedDict:
    """
    Progress Tracker node that retrieves milestones and answers questions.

    Args:
        state: AgentState containing student_id

    Returns:
        Updated state with response
    """
    student_id = state.get("student_id", "")
    message = state.get("message", "")

    if not student_id:
        return {
            "response": "No student ID provided.",
            "agent_used": "progress_tracker"
        }

    db = SessionLocal()
    try:
        milestones = db.query(Milestone).filter(Milestone.user_id == student_id).all()

        if not milestones:
            milestone_data = "No milestones found for this student."
        else:
            milestone_list = []
            for m in milestones:
                status = "Completed" if m.completed else "Pending"
                due = m.due_date.strftime("%Y-%m-%d") if m.due_date else "No date"
                milestone_list.append(f"- {m.title}: {status}, due {due}")

            completed_count = sum(1 for m in milestones if m.completed)
            total_count = len(milestones)

            pending_milestones = [m for m in milestones if not m.completed]
            next_milestone = min(pending_milestones, key=lambda m: m.due_date) if pending_milestones else None
            next_due = next_milestone.due_date.strftime("%Y-%m-%d") if next_milestone and next_milestone.due_date else "No upcoming deadlines"

            milestone_data = f"""Milestone Progress: {completed_count} of {total_count} completed

Upcoming: {next_due} - {next_milestone.title if next_milestone else 'None'}

All Milestones:
{chr(10).join(milestone_list)}"""

    except Exception as e:
        milestone_data = f"Error retrieving milestones: {str(e)}"
    finally:
        db.close()

    prompt = f"""{SYSTEM_PROMPT}

Student Question: {message}

Milestone Data:
{milestone_data}

Provide a helpful response:"""

    try:
        response = llm.invoke(prompt)
        response_text = response.content if hasattr(response, "content") else str(response)
    except Exception as e:
        response_text = f"I encountered an error: {str(e)}"

    return {
        "response": response_text,
        "agent_used": "progress_tracker"
    }