"""
Configuration module for PFE Coach.
Loads environment variables and initializes the LLM.
"""

import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq

load_dotenv()


def get_llm():
    """
    Initialize and return the Groq LLM instance.
    Uses llama-3.1-8b-instant with temperature 0.3.
    """
    return ChatGroq(
        model="llama-3.1-8b-instant",
        api_key=os.getenv("GROQ_API_KEY"),
        temperature=0.3,
    )


llm = get_llm()