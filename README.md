# 🎓 Smart Research Assistant using RAG

An AI-powered study companion that directly integrates with Google Classroom. It fetches enrolled courses, downloads course materials (PDFs, PPTs, Docs) directly from Google Drive into memory, and embeds them into a local vector database. Users can then seamlessly query a local LLM to summarize content, ask questions, and get exact citations without ever risking their personal data to public cloud AI providers.

## 🌟 Abstract

The "Smart Research Assistant using RAG" is designed to solve a major problem for students and educators: navigating complex course materials. Traditional search methods are keyword-bound, and manual reading takes time. 

By utilizing **Retrieval-Augmented Generation (RAG)** combined with **Google Classroom** integration, this tool creates a localized, completely private AI tutor. When a user signs in via Google OAuth, the backend identifies their courses, streams all attached Drive files (bypassing local file system storage for security), and tokenizes the knowledge into a **ChromaDB** vector store using **HuggingFace** embeddings. Finally, users can interact with a **DeepSeek local LLM** (via Ollama) to ask questions, gaining highly accurate answers with precise document-level citations.

---

## 🚀 Key Features

* **Google Classroom Integration:** Authenticates via Google OAuth2 to securely pull courses, announcements, and assignments. 
* **Live In-Memory Processing:** Course materials are fetched live from Drive and ingested strictly in-memory directly to the vector store. No files are downloaded or saved to the server's disk, minimizing risk and maximizing privacy.
* **100% Local AI Inference:** Runs queries through local `deepseek-r1:1.5b` (or other Ollama models) ensuring ZERO student data is sent to external API providers like OpenAI.
* **Retrieval-Augmented Generation (RAG):** Uses LangChain and ChromaDB to chunk and index documents, meaning the LLM only answers based strictly on the provided syllabus, eliminating hallucinations.
* **Modern UI/UX:** Built on React and Tailwind CSS, featuring dark mode, glassmorphism UI components, real-time message streaming, and beautiful animations.

---

## 🛠️ Tech Stack & Tools

### Frontend (User Interface)
* **React + Vite** - Fast, component-based frontend framework
* **Tailwind CSS** - Utility-first CSS styling for modern, premium aesthetics
* **Lucide React** - Clean and consistent iconography
* **Axios** - API client for backend communication
* **React Router DOM** - Handling multi-page navigation easily

### Backend (Server & RAG Pipeline)
* **FastAPI (Python)** - High-performance asynchronous API server
* **LangChain** - Framework for building the RAG LLM pipeline
* **ChromaDB** - Local vector database holding document embeddings
* **Ollama** - Locally hosts and runs the DeepSeek LLM
* **Google API Client** - Communicates with Google Classroom and Google Drive APIs
* **HuggingFace Embeddings** - (`all-MiniLM-L6-v2`) embedder for turning text into vectors
* **Python-PPTX & COM Automation** - Extracts text from `.pptx` and legacy `.ppt` files

---

## ⚙️ Installation & Setup

### Prerequisites
Before starting, ensure you have the following installed on your system:
1. **Node.js** (v18+)
2. **Python** (v3.10+)
3. **Ollama** ([Download](https://ollama.com/download))
4. A Google Cloud Console account with the **Google Classroom API** and **Google Drive API** enabled.

### 1. Backend Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/adarshkumarsingh23724/Smart-Research-Assistant-using-RAG.git
   cd Smart-Research-Assistant-using-RAG/backend
   ```
2. **Create a virtual environment & install dependencies:**
   ```bash
   python -m venv .venv
   .venv\Scripts\activate   # (On Windows)
   pip install -r requirements.txt
   ```
3. **Configure the Local LLM:**
   Run Ollama in the background and pull the required model:
   ```bash
   ollama run deepseek-r1:1.5b
   ```
4. **Google OAuth Credentials:**
   * Go to the Google Cloud Console.
   * Create an OAuth Client ID (Web Application).
   * Set Redirect URI to `http://localhost:8000/api/auth/callback`.
   * Download the JSON file, name it `credentials.json`, and place it in the `backend/` directory.

5. **Start the FastAPI Server:**
   ```bash
   uvicorn main:app --reload
   ```

### 2. Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd ../frontend
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Start the Vite development server:**
   ```bash
   npm run dev
   ```

### 3. Usage
* Open your browser and navigate to `http://localhost:5173`.
* Click **Sign in with Google** and grant the required Classroom/Drive permissions.
* Select a course from the dashboard to view announcements, materials, and assignments.
* Use the **Stream** or AI Chat section to ask questions directly about the materials!

---

## 🔒 Security & Git Configuration
When pushing to GitHub, **never expose your credentials**. This project comes with a robust `.gitignore` file that automatically hides:
* `backend/credentials.json` (Your Google Client Secrets)
* `backend/tokens/` (User access tokens)
* `backend/.env`
* `backend/chroma_db/` (Local Vector DB)

## 🤝 Contributing
Contributions, issues, and feature requests are welcome!

---
*Developed with modern stack technologies emphasizing extreme data privacy, localized AI, and academic organization.*
