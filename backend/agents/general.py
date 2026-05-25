"""
General agent for handling small talk or unclear intents.
"""

from typing import TypedDict
from config import llm


SYSTEM_PROMPT = """You are PFE Coach, a helpful academic assistant for final-year engineering students.
You help with project guidance, writing feedback, and tracking progress.
If the message is small talk (greetings, thanks, etc.), respond briefly and warmly.
If the intent is unclear, help redirect the student to the right kind of help:
- For questions about PFE methodology or project work, ask them to rephrase and I'll use the knowledge base
- For writing feedback, tell them to use the Writing Review page
- For milestone questions, tell them to ask about deadlines or progress

Keep responses brief and helpful. Respond in the same language the student used."""


def general_node(state: TypedDict) -> TypedDict:
    """
    General node for handling small talk or unclear intents.

    Args:
        state: AgentState containing message

    Returns:
        Updated state with response
    """
    message = state.get("message", "")

    prompt = f"""{SYSTEM_PROMPT}

Student Message: {message}

Provide a brief, helpful response:"""

    try:
        response = llm.invoke(prompt)
        response_text = response.content if hasattr(response, "content") else str(response)
    except Exception as e:
        response_text = f"I encountered an error: {str(e)}. Please try again."

    return {
        "response": response_text,
        "agent_used": "general"
    }