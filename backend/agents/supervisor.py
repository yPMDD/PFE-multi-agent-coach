"""
Supervisor agent for routing intents to appropriate agents.
"""

from typing import TypedDict


def supervisor_node(state: TypedDict) -> TypedDict:
    """
    Supervisor node that routes to the correct agent based on intent.

    Args:
        state: AgentState containing student_id, session_id, message, and intent

    Returns:
        Updated state with agent_used set
    """
    intent = state.get("intent", "general")

    if intent == "rag":
        return {"agent_used": "rag_agent"}
    elif intent == "writing_coach":
        return {"agent_used": "writing_coach"}
    elif intent == "progress_tracker":
        return {"agent_used": "progress_tracker"}
    else:
        return {"agent_used": "general"}


def route_based_on_intent(state: TypedDict) -> str:
    """
    Conditional edge function to route to appropriate agent node.

    Args:
        state: AgentState

    Returns:
        Node name to route to
    """
    intent = state.get("intent", "general")

    if intent == "rag":
        return "rag_agent"
    elif intent == "writing_coach":
        return "writing_coach"
    elif intent == "progress_tracker":
        return "progress_tracker"
    else:
        return "general"