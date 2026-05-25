"""
FastAPI application for PFE Coach.
"""

import os
import json
from typing import Optional
from uuid import uuid4
from datetime import datetime, timedelta
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from db.database import get_db, init_db
from db.models import User, Milestone, Session as SessionModel, Message
from graph.graph import graph, AgentState
from rag.ingest import ingest_knowledge_base

app = FastAPI(title="PFE Coach API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class InvokeRequest(BaseModel):
    student_id: str
    message: str
    session_id: str
    intent: str = "general"


class InvokeResponse(BaseModel):
    response: str
    agent_used: str
    session_id: str
    sources_used: str = ""


class IngestRequest(BaseModel):
    folder_path: str


class MilestoneCreate(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: str


class MilestoneUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[str] = None
    completed: Optional[bool] = None


class SyncUserRequest(BaseModel):
    uid: str
    email: str
    display_name: Optional[str] = None
    photo_url: Optional[str] = None


class CreateSessionRequest(BaseModel):
    session_type: str = "chat"


def get_user_id(x_user_id: Optional[str] = Header(None)) -> str:
    """Get user ID from header."""
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return x_user_id


@app.on_event("startup")
def startup_event():
    """Initialize database on startup."""
    try:
        init_db()
    except Exception as e:
        print(f"Database initialization: {e}")


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


@app.post("/auth/sync")
def sync_user(request: SyncUserRequest, db: Session = Depends(get_db), user_id: str = Depends(get_user_id)):
    """Sync user data from Firebase to database."""
    user = db.query(User).filter(User.id == request.uid).first()
    if not user:
        user = User(
            id=request.uid,
            email=request.email,
            display_name=request.display_name,
            photo_url=request.photo_url,
            created_at=datetime.utcnow()
        )
        db.add(user)
        db.commit()
    return {"status": "ok", "user_id": user.id}


@app.post("/invoke", response_model=InvokeResponse)
def invoke_agent(request: InvokeRequest, db: Session = Depends(get_db), user_id: str = Depends(get_user_id)):
    """Invoke the LangGraph agent with a student message."""
    existing_session = db.query(SessionModel).filter(SessionModel.id == request.session_id).first()
    if not existing_session:
        new_session = SessionModel(
            id=request.session_id,
            user_id=user_id,
            created_at=datetime.utcnow()
        )
        db.add(new_session)
        db.commit()

    user_message = Message(
        id=str(uuid4()),
        session_id=request.session_id,
        role="user",
        content=request.message,
        created_at=datetime.utcnow()
    )
    db.add(user_message)

    state: AgentState = {
        "student_id": user_id,
        "session_id": request.session_id,
        "message": request.message,
        "intent": request.intent,
        "context": [],
        "draft": "",
        "feedback": "",
        "response": "",
        "agent_used": "",
        "sources_used": ""
    }

    try:
        result = graph.invoke(state)
        response_text = result.get("response", "No response generated")
        agent_used = result.get("agent_used", "unknown")
        sources_used = result.get("sources_used", "")
    except Exception as e:
        response_text = f"Error processing request: {str(e)}"
        agent_used = "error"

    assistant_message = Message(
        id=str(uuid4()),
        session_id=request.session_id,
        role="assistant",
        content=response_text,
        agent_used=agent_used,
        created_at=datetime.utcnow()
    )
    db.add(assistant_message)
    db.commit()

    return InvokeResponse(
        response=response_text,
        agent_used=agent_used,
        session_id=request.session_id,
        sources_used=sources_used
    )


@app.post("/ingest")
def ingest_documents(request: IngestRequest):
    """Trigger RAG ingestion pipeline."""
    try:
        ingest_knowledge_base(request.folder_path)
        return {"status": "success", "message": "Documents ingested successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/milestones")
def get_milestones(db: Session = Depends(get_db), user_id: str = Depends(get_user_id)):
    """Get all milestones for the authenticated user."""
    milestones = db.query(Milestone).filter(Milestone.user_id == user_id).order_by(Milestone.due_date.asc()).all()
    return [
        {
            "id": m.id,
            "title": m.title,
            "description": m.description,
            "due_date": m.due_date.isoformat() if m.due_date else None,
            "completed": m.completed,
            "completed_at": m.completed_at.isoformat() if m.completed_at else None
        }
        for m in milestones
    ]


@app.post("/milestones")
def create_milestone(milestone: MilestoneCreate, db: Session = Depends(get_db), user_id: str = Depends(get_user_id)):
    """Create a new milestone."""
    try:
        due_date = datetime.fromisoformat(milestone.due_date)
    except ValueError:
        due_date = datetime.utcnow() + timedelta(days=30)

    new_milestone = Milestone(
        id=str(uuid4()),
        user_id=user_id,
        title=milestone.title,
        description=milestone.description,
        due_date=due_date,
        completed=False
    )
    db.add(new_milestone)
    db.commit()

    return {
        "id": new_milestone.id,
        "title": new_milestone.title,
        "description": new_milestone.description,
        "due_date": new_milestone.due_date.isoformat(),
        "completed": new_milestone.completed
    }


@app.patch("/milestones/{milestone_id}")
def update_milestone(milestone_id: str, update: MilestoneUpdate, db: Session = Depends(get_db), user_id: str = Depends(get_user_id)):
    """Update an existing milestone."""
    milestone = db.query(Milestone).filter(Milestone.id == milestone_id, Milestone.user_id == user_id).first()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")

    if update.title is not None:
        milestone.title = update.title
    if update.description is not None:
        milestone.description = update.description
    if update.due_date is not None:
        milestone.due_date = datetime.fromisoformat(update.due_date)
    if update.completed is not None:
        milestone.completed = update.completed
        milestone.completed_at = datetime.utcnow() if update.completed else None

    db.commit()
    db.refresh(milestone)

    return {
        "id": milestone.id,
        "title": milestone.title,
        "description": milestone.description,
        "due_date": milestone.due_date.isoformat(),
        "completed": milestone.completed,
        "completed_at": milestone.completed_at.isoformat() if milestone.completed_at else None
    }


@app.delete("/milestones/{milestone_id}")
def delete_milestone(milestone_id: str, db: Session = Depends(get_db), user_id: str = Depends(get_user_id)):
    """Delete a milestone."""
    milestone = db.query(Milestone).filter(Milestone.id == milestone_id, Milestone.user_id == user_id).first()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")

    db.delete(milestone)
    db.commit()
    return {"status": "deleted"}


@app.post("/sessions")
def create_session(request: CreateSessionRequest = None, db: Session = Depends(get_db), user_id: str = Depends(get_user_id)):
    """Create a new session."""
    session_type = request.session_type if request and request.session_type else "chat"
    
    session = SessionModel(
        id=str(uuid4()),
        user_id=user_id,
        session_type=session_type,
        created_at=datetime.utcnow()
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return {
        "id": session.id,
        "created_at": session.created_at.isoformat()
    }


@app.delete("/sessions/{session_id}")
def delete_session(session_id: str, db: Session = Depends(get_db), user_id: str = Depends(get_user_id)):
    """Delete a session and its messages."""
    # Try exact match first
    session = db.query(SessionModel).filter(SessionModel.id == session_id, SessionModel.user_id == user_id).first()
    
    # If not found, try partial match
    if not session:
        user_sessions = db.query(SessionModel).filter(SessionModel.user_id == user_id).all()
        for s in user_sessions:
            if session_id in s.id or s.id in session_id:
                session = s
                break
    
    if not session:
        raise HTTPException(status_code=404, detail=f"Session not found")
    
    db.query(Message).filter(Message.session_id == session.id).delete()
    db.delete(session)
    db.commit()
    return {"status": "deleted"}
    
    db.query(Message).filter(Message.session_id == session_id).delete()
    db.delete(session)
    db.commit()
    print(f"Deleted session: {session_id}")
    return {"status": "deleted"}


@app.get("/sessions")
def get_sessions(session_type: str = None, db: Session = Depends(get_db), user_id: str = Depends(get_user_id)):
    """Get all sessions for the authenticated user."""
    print(f"GET sessions - user: {user_id}, session_type filter: {session_type}")
    query = db.query(SessionModel).filter(SessionModel.user_id == user_id)
    if session_type:
        query = query.filter(SessionModel.session_type == session_type)
    sessions = query.order_by(SessionModel.created_at.desc()).all()
    print(f"Found {len(sessions)} sessions")
    return [
        {
            "id": s.id,
            "session_type": s.session_type,
            "created_at": s.created_at.isoformat()
        }
        for s in sessions
    ]


@app.get("/sessions/{session_id}/messages")
def get_session_messages(session_id: str, db: Session = Depends(get_db), user_id: str = Depends(get_user_id)):
    """Get all messages for a specific session."""
    session = db.query(SessionModel).filter(SessionModel.id == session_id, SessionModel.user_id == user_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    messages = db.query(Message).filter(Message.session_id == session_id).order_by(Message.created_at.asc()).all()
    return [
        {
            "id": m.id,
            "session_id": m.session_id,
            "role": m.role,
            "content": m.content,
            "agent_used": m.agent_used,
            "created_at": m.created_at.isoformat()
        }
        for m in messages
    ]


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("FASTAPI_PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)