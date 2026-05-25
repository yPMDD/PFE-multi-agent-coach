"""
MCP Web Search Server using Tavily.
Provides web search capability for the PFE Coach RAG agent.
"""

import os
from typing import Any
from tavily import TavilyClient

api_key = os.getenv("TAVILY_API_KEY")

client = TavilyClient(api_key=api_key) if api_key else None


def search_web(query: str, max_results: int = 5) -> list[dict[str, Any]]:
    """
    Search the web for relevant information.
    
    Args:
        query: The search query
        max_results: Maximum number of results to return (default: 5)
    
    Returns:
        List of search results with title, url, and content
    """
    if not client:
        return [{
            "title": "Web search not configured",
            "url": "",
            "content": "Please set TAVILY_API_KEY environment variable to enable web search."
        }]
    
    try:
        results = client.search(
            query=query,
            max_results=max_results,
            include_answer=True,
            include_raw_content=False
        )
        
        search_results = []
        for result in results.get("results", []):
            search_results.append({
                "title": result.get("title", ""),
                "url": result.get("url", ""),
                "content": result.get("content", "")[:500]
            })
        
        if results.get("answer"):
            search_results.insert(0, {
                "title": "AI Answer",
                "url": "",
                "content": results["answer"]
            })
        
        return search_results
    except Exception as e:
        return [{
            "title": "Search Error",
            "url": "",
            "content": f"Error performing web search: {str(e)}"
        }]


def format_search_results(results: list[dict]) -> str:
    """
    Format search results as a string for LLM context.
    
    Args:
        results: List of search result dictionaries
    
    Returns:
        Formatted string of search results
    """
    if not results:
        return "No web search results found."
    
    formatted = "=== WEB SEARCH RESULTS ===\n\n"
    for i, result in enumerate(results, 1):
        formatted += f"{i}. {result.get('title', 'No title')}\n"
        if result.get('url'):
            formatted += f"   URL: {result['url']}\n"
        if result.get('content'):
            formatted += f"   Content: {result['content']}\n"
        formatted += "\n"
    
    return formatted