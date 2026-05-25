"""
RAG retriever for querying ChromaDB.
"""

import os
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma


def get_retriever():
    """
    Get the ChromaDB retriever.

    Returns:
        Retriever for querying the knowledge base
    """
    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    chroma_path = os.getenv("CHROMA_PERSIST_PATH", "./chroma_db")
    vectorstore = Chroma(persist_directory=chroma_path, embedding_function=embeddings, collection_name="pfe_knowledge")
    return vectorstore.as_retriever(search_kwargs={"k": 4})


def retrieve_context(query: str) -> list:
    """
    Retrieve relevant context for a query.

    Args:
        query: User query

    Returns:
        List of relevant document chunks
    """
    retriever = get_retriever()
    docs = retriever.invoke(query)
    return [doc.page_content for doc in docs]