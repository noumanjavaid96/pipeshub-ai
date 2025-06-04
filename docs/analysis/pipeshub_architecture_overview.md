# Pipeshub-ai Architecture Overview

## 1. Overall Architecture

Pipeshub-ai is designed as a modular, microservices-based system, facilitating scalability and maintainability. The architecture primarily revolves around a React-based frontend, a Node.js service acting as a Backend-for-Frontend (BFF) and API gateway, and two core Python services: one dedicated to AI/RAG functionalities and another for managing data connectors.

**Key Technological Pillars:**

*   **Containerization & Orchestration:** The entire platform is containerized using Docker and orchestrated for development and production environments using Docker Compose. This ensures consistency across environments and simplifies deployment.
*   **Configuration Management:** Centralized configuration is managed via `etcd3`, a distributed key-value store. Sensitive configuration data stored in `etcd3` is encrypted, enhancing security.
*   **Asynchronous Processing:** The system leverages asynchronous task processing and event-driven communication through tools like Celery (for background tasks, especially in the Python AI service) and messaging queues such as Kafka and NATS. This allows for handling long-running operations like document indexing and inter-service communication efficiently.

The architecture promotes separation of concerns, allowing each service to specialize and scale independently.

## 2. Key Components

### 2.1. Frontend (`frontend/`)

*   **Technology:** React-based Single Page Application (SPA).
*   **Responsibilities:**
    *   Provides the user interface for all user interactions, including chat interfaces, dashboards, and administrative views.
    *   Handles user authentication flows (e.g., login, registration) in conjunction with the Node.js backend.
    *   Manages client-side state and presentation logic.
    *   Likely place for implementing tenant-specific branding in a white-label setup.

### 2.2. Node.js Service (`services/nodejs/`)

*   **Role:** Serves as a Backend-for-Frontend (BFF) and the primary API Gateway for the frontend.
*   **Core Functions:**
    *   **User & Organization Management:** Handles creation, authentication, authorization, and management of users, organizations (tenants), roles, and permissions. This is critical for the white-label admin dashboard functionality.
    *   **API Orchestration:** May route requests to appropriate backend services (e.g., Python AI Service, Python Connectors Service).
    *   **Storage Abstraction:** Appears to manage file uploads and interactions with blob storage solutions.
    *   **Configuration Interface:** Potentially offers an API to manage system configurations stored in `etcd3`.
*   **Database Interaction:** Directly interacts with ArangoDB for user, organization, and related metadata. May also interact with MongoDB for specific use cases.

### 2.3. Python Connectors Service (`services/python/connectors_main.py` & related modules)

*   **Role:** Dedicated to fetching and managing data from various external enterprise systems.
*   **Core Functions:**
    *   Implements logic to connect to sources like Google Workspace (Drive, Gmail, Calendar), Microsoft 365 (OneDrive, SharePoint, Outlook - some planned), Slack, Jira, Confluence, etc.
    *   Handles authentication and data extraction from these sources.
    *   Prepares and potentially normalizes data before sending it to the AI Service for indexing, likely via a message queue (Kafka/NATS) or direct API calls.
*   **Importance:** Crucial for populating the RAG system with relevant enterprise data.

### 2.4. Python AI Service (`services/python/` - `indexing_main.py`, `query_main.py`)

This service is the heart of the AI and RAG capabilities.

*   **RAG Pipeline Core:**
    *   **Document Ingestion & Processing:** Receives data from the Connectors Service (or direct uploads) and processes various file formats (PDFs with OCR, DOCX, etc.).
    *   **Chunking:** Employs a `CustomChunker` that performs semantic chunking with sophisticated logic for merging text and associated metadata (like bounding boxes), optimizing for contextual relevance.
    *   **Embedding Generation:** Uses a flexible `EmbeddingFactory` to create embedding models from various providers (OpenAI, Azure, HuggingFace, Cohere, Gemini, SentenceTransformers). These models convert text chunks into vector embeddings.
    *   **Vector Store (Qdrant):**
        *   Stores and indexes the document embeddings for efficient similarity searching.
        *   Configured for hybrid search (dense and sparse vectors).
        *   Metadata associated with vectors includes `orgId` and `virtualRecordId` for multi-tenancy and linking back to ArangoDB.
    *   **Metadata Storage & Primary Database (ArangoDB):**
        *   ArangoDB serves as the primary database for storing rich metadata about documents, users, organizations (tenants), knowledge bases, permissions, and complex relationships between them (leveraging its graph capabilities).
        *   This data model is fundamental for implementing multi-tenancy, access control, and providing context for the RAG system.
    *   **Retrieval (`RetrievalService`):**
        *   Handles incoming search queries.
        *   Fetches relevant document chunks from Qdrant.
        *   Crucially, applies multi-tenant filtering based on the querying user's `orgId` and their specific access permissions derived from ArangoDB, ensuring data isolation.
        *   Enriches retrieved chunks with full metadata from ArangoDB.
    *   **LLM Interaction (`LLMFactory` & usage in query processing):**
        *   Orchestrates calls to various Large Language Models (OpenAI, Anthropic, etc.) using LangChain.
        *   Provides the LLM with the retrieved context and the user's query to generate answers or insights.
*   **Multi-tenancy:**
    *   Data is isolated per organization (`orgId`) at both the ArangoDB level (for metadata and permissions) and Qdrant level (through metadata filtering in queries).
*   **Configuration:**
    *   All service configurations, including AI model choices, API keys, and database connection strings, are managed by the `ConfigurationService` which securely fetches them from `etcd3`.
*   **Asynchronous Operations:** Utilizes Celery for background tasks like document indexing.
