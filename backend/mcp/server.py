"""
MCP Server for PFE Coach.
Exposes web search as an MCP tool.
"""

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent
from pydantic import AnyUrl
import asyncio

from .web_search import search_web, format_search_results


app = Server("pfe-coach-mcp")


@app.list_tools()
async def list_tools() -> list[Tool]:
    """List available tools."""
    return [
        Tool(
            name="web_search",
            description="Search the web for current information, latest research, and real-time data. Use this to supplement the knowledge base with up-to-date information.",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query"
                    },
                    "max_results": {
                        "type": "integer",
                        "description": "Maximum number of results (default: 5)",
                        "default": 5
                    }
                },
                "required": ["query"]
            }
        )
    ]


@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    """Handle tool calls."""
    if name == "web_search":
        query = arguments.get("query", "")
        max_results = arguments.get("max_results", 5)
        
        results = search_web(query, max_results)
        formatted = format_search_results(results)
        
        return [TextContent(type="text", text=formatted)]
    
    raise ValueError(f"Unknown tool: {name}")


async def main():
    """Run the MCP server."""
    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            app.create_initialization_options()
        )


if __name__ == "__main__":
    asyncio.run(main())