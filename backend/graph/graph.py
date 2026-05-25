"""
LangGraph state graph for PFE Coach agents.
Defines the workflow with supervisor, RAG, writing coach, and progress tracker nodes.
"""

from typing import TypedDict
from langgraph.graph import StateGraph, END

from agents.supervisor import supervisor_node, route_based_on_intent
from agents.rag_agent import rag_agent_node
from agents.writing_coach import writing_coach_node
from agents.progress_tracker import progress_tracker_node
from agents.general import general_node


class AgentState(TypedDict):
    """State schema for the LangGraph workflow."""
    student_id: str
    session_id: str
    message: str
    intent: str
    context: list
    draft: str
    feedback: str
    response: str
    agent_used: str
    sources_used: str


def create_graph():
    """
    Create and compile the LangGraph state graph.

    Returns:
        Compiled StateGraph
    """
    workflow = StateGraph(AgentState)

    workflow.add_node("supervisor", supervisor_node)
    workflow.add_node("rag_agent", rag_agent_node)
    workflow.add_node("writing_coach", writing_coach_node)
    workflow.add_node("progress_tracker", progress_tracker_node)
    workflow.add_node("general", general_node)

    workflow.set_entry_point("supervisor")

    workflow.add_conditional_edges(
        "supervisor",
        route_based_on_intent,
        {
            "rag_agent": "rag_agent",
            "writing_coach": "writing_coach",
            "progress_tracker": "progress_tracker",
            "general": "general"
        }
    )

    workflow.add_edge("rag_agent", END)
    workflow.add_edge("writing_coach", END)
    workflow.add_edge("progress_tracker", END)
    workflow.add_edge("general", END)

    return workflow.compile()


graph = create_graph()