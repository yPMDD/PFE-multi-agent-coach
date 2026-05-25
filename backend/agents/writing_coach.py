"""
Writing Coach agent for analyzing academic writing and providing feedback.
"""

import json
from typing import TypedDict
from config import llm

SYSTEM_PROMPT = """You are an academic writing coach for final-year engineering students.
When given a piece of writing, analyze it for:
- Clarity: are ideas expressed clearly?
- Structure: does it follow proper academic structure?
- Tone: is the language formal and academic?
- Content: does the section contain what it should?

CRITICAL RULE — Value Alignment:
You must NEVER rewrite or complete the text for the student.
Your role is to identify issues and suggest improvements, not to produce the text yourself.
This is non-negotiable. If a student asks you to write something, redirect them to try first and come back for feedback.
Always be constructive and specific. Vague feedback like "improve your writing" is not acceptable.
Respond in the same language the student used.

Provide your feedback in JSON format:
{
  "overall": "short overall assessment",
  "issues": [
    { "type": "clarity | structure | tone | content", "description": "...", "suggestion": "..." }
  ],
  "strengths": ["..."],
  "next_step": "one concrete action the student should take"
}"""


def writing_coach_node(state: TypedDict) -> TypedDict:
    """
    Writing Coach node that analyzes text and provides structured feedback.

    Args:
        state: AgentState containing message/draft

    Returns:
        Updated state with feedback
    """
    message = state.get("message", "")
    draft = state.get("draft", "")

    text_to_analyze = draft if draft else message

    if not text_to_analyze.strip():
        return {
            "feedback": json.dumps({
                "overall": "No text provided",
                "issues": [],
                "strengths": [],
                "next_step": "Please paste your draft text to receive feedback"
            }),
            "response": "Please provide text for review.",
            "agent_used": "writing_coach"
        }

    refusal_keywords = ["write", "écris", "rédige", "complète", "finish my", "do my"]
    if any(keyword in text_to_analyze.lower()[:100] for keyword in refusal_keywords):
        refusal_response = json.dumps({
            "overall": "I don't write text for students",
            "issues": [],
            "strengths": [],
            "next_step": "Try writing the text yourself first, then come back for feedback"
        })
        return {
            "feedback": refusal_response,
            "response": "My role is to guide, not to write for you. Please write your draft first and I'll provide feedback to help you improve.",
            "agent_used": "writing_coach"
        }

    prompt = f"""{SYSTEM_PROMPT}

Student's Text:
{text_to_analyze}

Analyze the text and provide feedback in JSON format:"""

    try:
        response = llm.invoke(prompt)
        response_text = response.content if hasattr(response, "content") else str(response)

        try:
            feedback_json = json.loads(response_text)
            feedback = json.dumps(feedback_json)
        except json.JSONDecodeError:
            feedback = response_text

        return {
            "draft": text_to_analyze,
            "feedback": feedback,
            "response": response_text,
            "agent_used": "writing_coach"
        }
    except Exception as e:
        error_response = json.dumps({
            "overall": "Error analyzing text",
            "issues": [{"type": "error", "description": str(e), "suggestion": "Please try again"}],
            "strengths": [],
            "next_step": "Try submitting your text again"
        })
        return {
            "feedback": error_response,
            "response": f"I encountered an error: {str(e)}",
            "agent_used": "writing_coach"
        }