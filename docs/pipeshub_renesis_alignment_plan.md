# Pipeshub-ai Alignment with Renesis Proposal

This document provides an analysis of the Pipeshub-ai platform, its architecture, and how it aligns with the project proposal from Renesis Tech Team. It also outlines considerations for any potential modifications.

## 1. Overview of Pipeshub-ai Architecture

Pipeshub-ai is a sophisticated workplace AI platform designed with a microservices architecture to ensure scalability and maintainability.

**Key Architectural Components:**

*   **Frontend:** A React-based single-page application providing the user interface, dashboard, and chat functionalities. It interacts with the Node.js API Gateway.
*   **API Gateway:** A Node.js application that serves as the primary entry point for frontend requests. It handles authentication, request routing to appropriate backend microservices, and potentially some data aggregation.
*   **Backend Services (Python/FastAPI):** A suite of specialized microservices:
    *   **Connectors Service:** Manages connections to various external data sources (e.g., Google Workspace, Microsoft 365).
    *   **Indexing Service:** Responsible for the core document processing pipeline: fetching data via connectors, chunking (using a custom semantic chunker), generating embeddings, and storing them in the vector database (Qdrant) along with metadata in the knowledge graph (ArangoDB).
    *   **Query Service:** Handles user queries, orchestrates the RAG (Retrieval Augmented Generation) process by interacting with the `RetrievalService` (which queries Qdrant and ArangoDB for permissions) and the `LLMService` to generate responses.
*   **Data Stores & Infrastructure:**
    *   **Vector Database (Qdrant):** Used for storing and searching document embeddings, enabling semantic search. Configured for hybrid search.
    *   **Knowledge Graph & Primary Database (ArangoDB):** A multi-model database used to store rich metadata, relationships between data entities, user information, organization details, and fine-grained permissions. This forms the backbone of the platform's data organization and access control.
    *   **Configuration Store (etcd3):** A distributed key-value store used for managing service configurations, including sensitive data which is encrypted.
    *   **Cache (Redis):** Used for caching to improve performance.
    *   **Message Queues (Kafka/NATS):** Facilitate asynchronous communication and task processing between services.
    *   **Background Task Processing (Celery):** Used for handling long-running tasks like document indexing.
*   **Containerization:** The entire platform is containerized using Docker and orchestrated with Docker Compose for development and production deployments.

**Data Flow (Simplified):**

*   **Indexing:**
    1.  Data is fetched from connected sources by the Connectors Service.
    2.  The Indexing Service processes the data: documents are parsed, chunked (custom semantic chunking), and text is extracted.
    3.  Embeddings are generated for these chunks using a configurable embedding model (via `EmbeddingFactory`).
    4.  The embeddings and associated metadata (including `orgId` for multi-tenancy and `virtualRecordId` for linking) are stored in Qdrant.
    5.  Detailed metadata, relationships, and indexing status are stored/updated in ArangoDB.
*   **Querying (RAG):**
    1.  A user query is received by the API Gateway (Node.js) from the React frontend.
    2.  After authentication, the query is routed to the Query Service (Python/FastAPI).
    3.  The `RetrievalService` uses the user's `orgId` and `userId` to:
        *   Query ArangoDB to determine accessible records based on permissions.
        *   Construct a filtered query for Qdrant (filtering by `orgId` and accessible `virtualRecordId`s).
    4.  Relevant document chunks are retrieved from Qdrant based on semantic similarity.
    5.  The retrieved context is enriched with full metadata from ArangoDB.
    6.  This context, along with the original query, is passed to a configured LLM (via `LLMService`) to generate a final answer.
    7.  The answer is returned to the user through the API Gateway and Frontend.

This architecture is designed for flexibility, allowing for different LLMs, embedding models, and data sources to be integrated. The use of ArangoDB for knowledge graph capabilities and permissions is a distinctive feature, enabling sophisticated data relationships and access control.
