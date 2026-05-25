"""
RAG ingestion pipeline for processing documents and storing in ChromaDB.
"""

import os
import sys
from pathlib import Path
from typing import List
from langchain_community.document_loaders import (
    PyPDFLoader,
    Docx2txtLoader,
    TextLoader
)
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma


CHUNK_SIZE = 500
CHUNK_OVERLAP = 50
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
COLLECTION_NAME = "pfe_knowledge"


def load_documents(folder_path: str) -> List:
    """
    Load all documents from a folder.

    Args:
        folder_path: Path to folder containing documents

    Returns:
        List of loaded documents
    """
    folder = Path(folder_path)
    documents = []

    for file_path in folder.rglob("*"):
        if file_path.is_file():
            extension = file_path.suffix.lower()
            try:
                if extension == ".pdf":
                    loader = PyPDFLoader(str(file_path))
                    documents.extend(loader.load())
                elif extension == ".docx":
                    loader = Docx2txtLoader(str(file_path))
                    documents.extend(loader.load())
                elif extension == ".md" or extension == ".txt":
                    loader = TextLoader(str(file_path), encoding="utf-8")
                    documents.extend(loader.load())
            except Exception as e:
                print(f"Error loading {file_path}: {e}")

    return documents


def split_documents(documents: List) -> List:
    """
    Split documents into chunks.

    Args:
        documents: List of documents

    Returns:
        List of document chunks
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP
    )
    return splitter.split_documents(documents)


def ingest_knowledge_base(folder_path: str):
    """
    Ingest knowledge base documents into ChromaDB.

    Args:
        folder_path: Path to folder containing documents
    """
    print(f"Loading documents from {folder_path}...")
    documents = load_documents(folder_path)
    print(f"Loaded {len(documents)} documents")

    print("Splitting documents into chunks...")
    chunks = split_documents(documents)
    print(f"Created {len(chunks)} chunks")

    print("Creating embeddings...")
    embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)

    chroma_path = os.getenv("CHROMA_PERSIST_PATH", "./chroma_db")
    print(f"Storing in ChromaDB at {chroma_path}...")

    vectorstore = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=chroma_path,
        collection_name=COLLECTION_NAME
    )

    print(f"Successfully ingested {len(chunks)} chunks into ChromaDB")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python ingest.py <folder_path>")
        sys.exit(1)

    folder_path = sys.argv[1]
    ingest_knowledge_base(folder_path)