# PFE Coach - Technical Documentation

An AI-powered coaching assistant that helps university students complete their final-year project (PFE). The system implements **Value Alignment** - the AI guides students rather than completing tasks for them.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [System Architecture](#system-architecture)
4. [Multi-Agent System (LangGraph)](#multi-agent-system-langgraph)
5. [Hybrid RAG + MCP Web Search](#hybrid-rag--mcp-web-search)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [Docker Services](#docker-services)
9. [Environment Variables](#environment-variables)
10. [Setup & Deployment](#setup--deployment)
11. [Frontend Components](#frontend-components)
12. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

The PFE Coach system implements a **hybrid multi-agent architecture** combining:

- **LangGraph Multi-Agent System**: Orchestrates 4 specialized AI agents
- **Hybrid RAG + MCP Web Search**: Combines local knowledge base with real-time web search
- **Microservices via Docker**: Frontend, Backend, PostgreSQL, ChromaDB, pgAdmin
- **Firebase Authentication**: Google OAuth for secure user management

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                               PFE COACH ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐                │
│  │   Frontend  │─────▶│   FastAPI   │─────▶│  LangGraph  │                │
│  │   (React)   │      │   (Python)  │      │   (Agents)  │                │
│  └─────────────┘      └─────────────┘      └──────┬──────┘                │
│                                                  │                         │
│                   ┌──────────────────────────────┼──────────────────────┐  │
│                   │                              │                      │  │
│  ┌────────────────▼─────────┐   ┌───────────────▼───────┐   ┌────────────▼┐ │
│  │     MCP Web Search       │   │   ChromaDB            │   │ PostgreSQL  │ │
│  │     (Tavily API)         │   │   (Vector Store)      │   │ (Database)  │ │
│  └─────────────────────────┘   └───────────────────────┘   └─────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18 + Vite + Tailwind | UI with dark mode |
| **Backend** | FastAPI + Python 3.11 | REST API + async processing |
| **AI Agents** | LangGraph | Multi-agent orchestration |
| **LLM** | Groq (Llama 3.1 8B) | Fast AI inference |
| **Vector Store** | ChromaDB | Semantic search for RAG |
| **Database** | PostgreSQL 15 | Relational data storage |
| **Authentication** | Firebase Auth | Google OAuth |
| **Container** | Docker + Compose | Orchestration |

---

## System Architecture

### Request Flow

```
1. User authenticates via Firebase (Google OAuth)
2. Frontend sends request with X-User-Id header
3. FastAPI validates user and forwards to LangGraph
4. Supervisor routes to appropriate agent based on intent
5. Agent processes request (RAG + MCP or database query)
6. Response sent back with source metadata
7. Frontend displays with loading animations
```

### Hybrid Intelligence Pipeline

```
User Query
    │
    ▼
┌─────────────────┐
│ Intent Detection│ (Frontend keyword matching)
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│           LangGraph Supervisor          │
│   Routes to: RAG / Writing / Progress   │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│         RAG Agent (Hybrid Mode)         │
├─────────────────────────────────────────┤
│  1. ChromaDB → Knowledge Base Search    │
│  2. MCP → Tavily Web Search             │
│  3. LLM → Synthesize Both Sources       │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│    Response + Sources Metadata          │
│    [SOURCES: RAG | MCP] [AGENT: RAG]    │
└─────────────────────────────────────────┘
```

---

## Multi-Agent System (LangGraph)

### Agent Architecture

The system uses **LangGraph** with a **supervisor pattern** to route queries to specialized agents:

```
┌────────────────────────────────────────────────────────────┐
│                     LangGraph Workflow                     │
├────────────────────────────────────────────────────────────┤
│                                                            │
│   START                                                    │
│     │                                                      │
│     ▼                                                      │
│  ┌───────────────────────┐                                 │
│  │     SUPERVISOR        │                                 │
│  │  (Intent Router)      │ ─── intent='rag'                 │
│  └───────────┬───────────┘                                 │
│              │                                             │
│    ┌─────────┼─────────┬────────────┐                      │
│    ▼         ▼         ▼            ▼                      │
│ ┌──────┐ ┌────────┐ ┌──────────┐ ┌──────┐                   │
│ │ RAG  │ │Writing │ │Progress  │ │General│                   │
│ │Agent │ │ Coach  │ │ Tracker  │ │Agent │                   │
│ └──┬───┘ └────┬───┘ └────┬─────┘ └──┬───┘                   │
│    │          │          │         │                       │
│    └──────────┴──────────┴─────────┘                       │
│                   │                                        │
│                   ▼                                        │
│                  END                                       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Agent Specifications

| Agent | Intent | Function | Data Source |
|-------|--------|----------|-------------|
| **RAG Agent** | `rag` | Knowledge base + Web search | ChromaDB + Tavily |
| **Writing Coach** | `writing_coach` | Academic writing feedback | LLM only |
| **Progress Tracker** | `progress_tracker` | Milestone management | PostgreSQL |
| **General Agent** | `general` | Fallback / small talk | LLM only |

### Supervisor Logic (Frontend-based)

```javascript
// Keyword detection for intent routing
const progressKeywords = ['deadline', 'progress', 'milestone', 'due date', 'completed'];
const writingKeywords = ['review', 'feedback', 'writing', 'draft', 'improve'];

// Default: RAG agent for methodology questions
```

---

## Hybrid RAG + MCP Web Search

### Architecture

The RAG agent implements a **hybrid retrieval strategy** that combines:

1. **Local Knowledge Base** (ChromaDB)
   - Pre-ingested documents (methodology_guide.md, writing_guide.md)
   - Semantic search using sentence-transformers embeddings

2. **Web Search** (MCP + Tavily)
   - Real-time information retrieval
   - Fallback for latest topics not in knowledge base

### Implementation

```python
# In agents/rag_agent.py
def rag_agent_node(state):
    # Step 1: RAG - Search knowledge base
    docs = retriever.invoke(message)
    rag_context = [doc.page_content for doc in docs]
    
    # Step 2: MCP - Web search
    web_results = search_web(message, max_results=5)
    web_context = format_search_results(web_results)
    
    # Step 3: Combine both sources
    prompt = f"""
    === KNOWLEDGE BASE ===
    {rag_context}
    
    {web_context}
    
    Based on BOTH sources, provide response
    """
```

### Response Metadata

Each response includes:

```
[SOURCES: RAG (Knowledge Base) | MCP (Web Search)] - [AGENT: RAG Agent]
```

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│      User       │       │    Session      │       │    Message      │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │◀──────│ user_id (FK)    │       │ session_id (FK) │
│ email           │       │ id (PK)         │◀──────│ id (PK)         │
│ display_name    │       │ session_type    │       │ role            │
│ photo_url       │       │ created_at      │       │ content         │
│ created_at      │       └─────────────────┘       │ agent_used      │
└─────────────────┘                                 │ created_at      │
                                                      └────────┬────────┘
                                                               │
                              ┌───────────────────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Milestone     │
                       ├─────────────────┤
                       │ id (PK)         │
                       │ user_id (FK)    │
                       │ title           │
                       │ description     │
                       │ due_date        │
                       │ completed       │
                       │ completed_at    │
                       └─────────────────┘
```

### SQLAlchemy Models

```python
# db/models.py

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True)  # Firebase UID
    email = Column(String, nullable=False, unique=True)
    display_name = Column(String)
    photo_url = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class Session(Base):
    __tablename__ = "sessions"
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"))
    session_type = Column(String, default="chat")  # "chat" or "review"
    created_at = Column(DateTime, default=datetime.utcnow)

class Message(Base):
    __tablename__ = "messages"
    id = Column(String, primary_key=True)
    session_id = Column(String, ForeignKey("sessions.id"))
    role = Column(String)  # "user" or "assistant"
    content = Column(Text)
    agent_used = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class Milestone(Base):
    __tablename__ = "milestones"
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"))
    title = Column(String, nullable=False)
    description = Column(Text)
    due_date = Column(DateTime, nullable=False)
    completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
```

---

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/sync` | Sync Firebase user to PostgreSQL |

### Chat & Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/invoke` | Invoke LangGraph agent |
| GET | `/sessions` | Get user's sessions |
| POST | `/sessions` | Create new session |
| DELETE | `/sessions/{id}` | Delete session |
| GET | `/sessions/{id}/messages` | Get session messages |

### Milestones

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/milestones` | Get all user milestones |
| POST | `/milestones` | Create milestone |
| PATCH | `/milestones/{id}` | Update milestone |
| DELETE | `/milestones/{id}` | Delete milestone |

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/ingest` | Trigger RAG ingestion |

---

## Docker Services

### Service Overview

```yaml
services:
  postgres:      # PostgreSQL 15 - Main database
  pgadmin:       # pgAdmin 4 - Database management UI
  backend:       # FastAPI + LangGraph - AI processing
  frontend:      # React + Vite - User interface
```

### Service Details

| Service | Image | Port | Volumes |
|---------|-------|------|---------|
| **postgres** | postgres:15-alpine | 5433 | postgres_data |
| **pgadmin** | dpage/pgadmin4 | 5050 | pgadmin_data |
| **backend** | pfe-backend (custom) | 8000 | chroma_data |
| **frontend** | pfe-frontend (custom) | 5173 | - |

### Container Networking

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Backend   │────▶│  PostgreSQL │
│   :5173     │     │   :8000     │     │   :5432     │
└─────────────┘     └──────┬──────┘     └─────────────┘
                          │
                   ┌──────▼──────┐
                   │  ChromaDB  │
                   │  (in-app)  │
                   └─────────────┘
```

---

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `GROQ_API_KEY` | Groq LLM API key | `gsk_...` |
| `TAVILY_API_KEY` | Tavily web search (optional) | `tvly-...` |
| `VITE_FIREBASE_API_KEY` | Firebase web config | `AIzaSy...` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project | `pfecoach-...` |

### PostgreSQL Configuration

| Variable | Default |
|----------|---------|
| `POSTGRES_USER` | pfe |
| `POSTGRES_PASSWORD` | pfe_secret |
| `POSTGRES_DB` | pfe_coach |
| `DATABASE_URL` | postgresql://pfe:pfe_secret@postgres:5432/pfe_coach |

---

## Setup & Deployment

### Quick Start (Docker)

```bash
# 1. Configure environment
cp .env.docker .env
# Edit .env with your API keys

# 2. Build and run
docker compose build
docker compose up -d

# 3. Access services
# Frontend: http://localhost:5173
# Backend:  http://localhost:8000
# API Docs: http://localhost:8000/docs
# pgAdmin:  http://localhost:5050 (admin@pfecoach.local / pfe_secret)
```

### Manual Setup (Development)

```bash
# Backend
cd backend
pip install -r requirements.txt
python db/init_db.py
python rag/ingest.py ./knowledge_base
python -m uvicorn main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

### Initial Data

The system seeds sample data on first run:
- 1 sample user (Ahmed Benali)
- 5 project milestones (Proposal, Literature Review, System Design, Implementation, Final Report)
- 1 default chat session

---

## Frontend Components

### Page Structure

| Route | Component | Description |
|-------|-----------|-------------|
| `/login` | LoginPage | Firebase Google OAuth |
| `/` | Dashboard | Milestone overview, progress stats |
| `/chat` | Chat | Multi-agent chat with session history |
| `/milestones` | Milestones | CRUD for project milestones |
| `/review` | Review | Writing feedback with session history |

### Key Features

- **Loading Animations**: Bouncing dots show processing stage
- **Source Badges**: Display which sources (RAG/MCP) were used
- **Intent Detection**: Keyword-based routing to appropriate agent
- **Session Management**: Create, switch, delete chat sessions

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| LLM errors | Verify `GROQ_API_KEY` is valid |
| Database connection | Check PostgreSQL: `docker compose ps` |
| Frontend can't reach backend | Ensure backend running on port 8000 |
| Web search not working | Add `TAVILY_API_KEY` to environment |
| pgAdmin can't connect | Use `postgres` as host (not localhost) |

### Logs

```bash
# View all logs
docker compose logs -f

# View specific service
docker compose logs -f backend
docker compose logs -f postgres
```

---

## Project Structure

```
pfe-coach/
├── frontend/                    # React + Vite + Tailwind
│   ├── src/
│   │   ├── components/          # Layout, Icons
│   │   ├── hooks/               # useAuth (Firebase)
│   │   ├── lib/                 # API, Firebase config
│   │   └── pages/               # Dashboard, Chat, Milestones, Review
│   ├── Dockerfile
│   └── package.json
│
├── backend/                     # FastAPI + LangGraph
│   ├── agents/                  # Agent implementations
│   │   ├── rag_agent.py         # Hybrid RAG + MCP
│   │   ├── writing_coach.py     # Writing feedback
│   │   ├── progress_tracker.py  # Milestone queries
│   │   ├── supervisor.py         # Intent routing
│   │   └── general.py           # Fallback
│   ├── graph/                   # LangGraph workflow
│   │   └── graph.py             # StateGraph definition
│   ├── rag/                     # RAG pipeline
│   │   ├── ingest.py            # Document ingestion
│   │   └── retriever.py         # ChromaDB retrieval
│   ├── mcp/                     # MCP servers
│   │   ├── server.py            # MCP server
│   │   └── web_search.py        # Tavily integration
│   ├── db/                      # Database
│   │   ├── models.py            # SQLAlchemy models
│   │   ├── database.py          # DB connection
│   │   └── init_db.py           # DB initialization
│   ├── knowledge_base/          # RAG documents
│   │   ├── methodology_guide.md
│   │   └── writing_guide.md
│   ├── main.py                  # FastAPI app
│   ├── config.py                # LLM configuration
│   ├── Dockerfile
│   ├── entrypoint.sh            # Docker startup script
│   └── requirements.txt
│
├── docker-compose.yml           # Orchestration
├── .env.docker                  # Environment template
├── .dockerignore               # Build exclusions
└── README.md
```

---

## Value Alignment Principle

PFE Coach follows a strict **Value Alignment** philosophy:

- **NEVER** rewrite student work
- **ALWAYS** provide feedback, not completion
- **NEVER** make up deadlines - use real data only
- **GUIDE** students to discover answers themselves

This ensures the AI enhances learning rather than replacing critical thinking.

---

## License

MIT License