"""
RAG agent for retrieving knowledge from ChromaDB and generating responses.
Uses hybrid approach: RAG + Web Search for better responses.
"""

import os
from typing import TypedDict
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from config import llm
from mcp.web_search import search_web, format_search_results

SYSTEM_PROMPT = """You are PFE Coach, an academic advisor helping a university student complete their final-year project.
Your role is to GUIDE, not to do the work for the student.

You have access to TWO sources of information:
1. KNOWLEDGE BASE: Documents from the student's PFE methodology guides
2. WEB SEARCH: Current information from the web

Use BOTH sources to provide the best answer. Synthesize information from both sources when relevant.
If you don't know the answer, say so honestly.
Never write report sections on behalf of the student. Instead, explain concepts, suggest approaches, and ask guiding questions.
Always respond in the same language the student used (French or English)."""


def get_retriever():
    """Get the ChromaDB retriever."""
    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    chroma_path = os.getenv("CHROMA_PERSIST_PATH", "./chroma_db")
    vectorstore = Chroma(persist_directory=chroma_path, embedding_function=embeddings, collection_name="pfe_knowledge")
    return vectorstore.as_retriever(search_kwargs={"k": 4})


def rag_agent_node(state: TypedDict) -> TypedDict:
    """
    RAG agent node with hybrid approach (RAG + Web Search).
    Retrieves context from both ChromaDB and web search, then generates response.

    Args:
        state: AgentState containing message and context

    Returns:
        Updated state with response and retrieved context
    """
    message = state.get("message", "")
    student_id = state.get("student_id", "")

    # Step 1: Get RAG context from knowledge base
    try:
        retriever = get_retriever()
        docs = retriever.invoke(message)
        rag_context = [doc.page_content for doc in docs]
        rag_context_str = "\n\n".join(rag_context)
    except Exception:
        rag_context_str = "No relevant context found in knowledge base."
        rag_context = []

    # Step 2: Get Web Search results
    web_used = False
    try:
        web_results = search_web(message, max_results=5)
        web_context_str = format_search_results(web_results)
        web_context = [r.get("content", "") for r in web_results]
        web_used = len(web_results) > 0 and "Search Error" not in str(web_results[0].get("title", ""))
    except Exception:
        web_context_str = "Web search unavailable."
        web_context = []

    rag_used = len(rag_context) > 0

    # Determine sources used
    sources_used = []
    if rag_used:
        sources_used.append("RAG (Knowledge Base)")
    if web_used:
        sources_used.append("MCP (Web Search)")
    sources_str = " | ".join(sources_used) if sources_used else "No external sources"

    # Step 3: Build combined prompt with both sources
    prompt = f"""{SYSTEM_PROMPT}

=== KNOWLEDGE BASE (Local Documents) ===
{rag_context_str}

{web_context_str}

=== QUESTION ===
Student Question: {message}

Based on BOTH the knowledge base AND web search results above, provide a comprehensive and helpful coaching response.

IMPORTANT: At the end of your response, add a line:
[SOURCES: {sources_str}] - [AGENT: RAG Agent]"""

    try:
        response = llm.invoke(prompt)
        response_text = response.content if hasattr(response, "content") else str(response)
    except Exception as e:
        response_text = f"I encountered an error: {str(e)}. Please try again."

    # Combine both contexts for the state
    combined_context = rag_context + web_context

    return {
        "context": combined_context,
        "response": response_text,
        "agent_used": "rag_agent",
        "sources_used": sources_str
    }