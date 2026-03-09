import os
import tempfile
from tempfile import NamedTemporaryFile
from langchain_ollama import ChatOllama
from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_core.documents import Document

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from dotenv import load_dotenv

load_dotenv()

# Initialize components
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

CHROMA_DB_PATH = "./chroma_db"

def get_vector_store():
    global vector_store
            
    # Ensure directory exists before initializing Chroma
    os.makedirs(CHROMA_DB_PATH, exist_ok=True)
    
    # Initialize or load Chroma DB
    try:
        vector_store = Chroma(
            persist_directory=CHROMA_DB_PATH,
            embedding_function=embeddings
        )
    except Exception as e:
        print(f"Error loading Chroma DB: {e}")
        # Make a new one
        vector_store = Chroma(
            embedding_function=embeddings,
            persist_directory=CHROMA_DB_PATH
        )
        
    return vector_store

vector_store = None

def get_llm(model_override: str = None):
    """
    Returns a DeepSeek R1 model running locally via Ollama.
    Supports dynamic switching between fast (1.5b) and detailed (7b) models.
    """
    # If the user explicitly selected a model via UI, use it. Otherwise fallback to env or 1.5b.
    model = model_override if model_override else os.getenv("OLLAMA_MODEL", "deepseek-r1:1.5b")
    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    return ChatOllama(
        model=model,
        base_url=base_url,
        temperature=0,
    )

def delete_file_chunks(file_name: str, course_id: str = None):
    """
    Deletes existing chunks for a specific file from the vector store to prevent duplication.
    """
    try:
        vs = get_vector_store()
        
        # Build where clause
        where = {"source": file_name}
        if course_id:
            where["course_id"] = course_id
            
        # Get IDs matching the where clause
        results = vs.get(where=where)
        ids_to_delete = results.get("ids", [])
        
        if ids_to_delete:
            vs.delete(ids_to_delete)
            print(f"Deleted {len(ids_to_delete)} existing chunks for {file_name}")
    except Exception as e:
        print(f"Error during deduplication: {e}")

def _load_pptx(file_path: str) -> list:
    """
    Extract text from a .pptx file using python-pptx (no LibreOffice needed).
    Returns a list of LangChain Document objects, one per slide.
    """
    from pptx import Presentation
    prs = Presentation(file_path)
    docs = []
    for slide_num, slide in enumerate(prs.slides, start=1):
        texts = []
        for shape in slide.shapes:
            if shape.has_text_frame:
                for para in shape.text_frame.paragraphs:
                    line = " ".join(run.text for run in para.runs).strip()
                    if line:
                        texts.append(line)
        content = "\n".join(texts)
        if content.strip():
            docs.append(Document(
                page_content=content,
                metadata={"page": slide_num, "source": os.path.basename(file_path)}
            ))
    print(f"[_load_pptx] Extracted {len(docs)} slide(s) from {os.path.basename(file_path)}")
    return docs


def _load_ppt_via_com(file_path: str) -> list:
    """
    Convert legacy .ppt (binary OLE format) to .pptx using PowerPoint COM automation
    (Windows only — uses the already-installed Microsoft PowerPoint, no LibreOffice needed),
    then load it with _load_pptx.
    """
    try:
        import comtypes.client  # ships with pywin32 / comtypes, already on Windows
        print(f"[_load_ppt_via_com] Converting '{os.path.basename(file_path)}' via PowerPoint COM...")

        # Create a temp .pptx path
        tmp_pptx = tempfile.mktemp(suffix=".pptx")
        abs_path = os.path.abspath(file_path)

        powerpoint = comtypes.client.CreateObject("Powerpoint.Application")
        powerpoint.Visible = 1  # Must be visible on some Windows setups
        deck = powerpoint.Presentations.Open(abs_path, ReadOnly=True, Untitled=True, WithWindow=False)
        deck.SaveAs(tmp_pptx, 24)  # 24 = ppSaveAsOpenXMLPresentation (.pptx)
        deck.Close()
        powerpoint.Quit()

        print(f"[_load_ppt_via_com] Converted to temp .pptx: {tmp_pptx}")
        docs = _load_pptx(tmp_pptx)

        # Cleanup temp file
        try:
            os.remove(tmp_pptx)
        except Exception:
            pass

        return docs

    except ImportError:
        raise RuntimeError(
            "Could not import 'comtypes'. Install it with:  pip install comtypes\n"
            "Or convert your .ppt file to .pptx manually and re-upload."
        )
    except Exception as e:
        raise RuntimeError(
            f"Failed to convert '{os.path.basename(file_path)}' using PowerPoint COM.\n"
            f"Tip: Make sure Microsoft PowerPoint is installed, then try again.\n"
            f"Or convert the file to .pptx manually and re-upload.\n"
            f"Original error: {e}"
        )


def ingest_file_from_path(file_path: str, course_id: str = None, user_id: str = None):
    """
    Ingests a file (.pdf, .docx, .pptx, .ppt) from a local file path with deduplication.
    """
    try:
        file_name = os.path.basename(file_path)
        ext = file_path.lower().split('.')[-1]

        if ext == 'pdf':
            loader = PyPDFLoader(file_path)
            docs = loader.load()
        elif ext == 'docx':
            loader = Docx2txtLoader(file_path)
            docs = loader.load()
        elif ext == 'pptx':
            docs = _load_pptx(file_path)
        elif ext == 'ppt':
            # Convert legacy .ppt → .pptx via PowerPoint COM (Windows only, no LibreOffice needed)
            docs = _load_ppt_via_com(file_path)
        else:
            raise ValueError(f"Unsupported file extension: {ext}")
        
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", ".", " ", ""]
        )
        splits = text_splitter.split_documents(docs)
        
        # Add metadata
        for split in splits:
            if course_id:
                split.metadata["course_id"] = course_id
            if user_id:
                split.metadata["user_id"] = user_id
            split.metadata["source"] = file_name
        
        # Deduplicate before adding
        delete_file_chunks(file_name, course_id)
        
        # Add to vector store
        vs = get_vector_store()
        vs.add_documents(splits)
        # Chroma saves automatically, no need to call save_local
        return {"status": "success", "chunks_added": len(splits)}
    except Exception as e:
        print(f"Error ingesting {file_path}: {e}")
        raise e

def ingest_file_from_bytes(file_bytes: bytes, file_name: str, course_id: str = None, user_id: str = None):
    """
    Ingests a file from raw bytes (e.g. fetched in-memory from Google Drive).
    Creates a temp directory, saves the file with its REAL name, ingests, then cleans up.
    This ensures the 'source' metadata in ChromaDB matches the original filename.
    No permanent disk storage needed.
    """
    import tempfile
    import shutil
    tmp_dir = None
    try:
        tmp_dir = tempfile.mkdtemp()
        tmp_path = os.path.join(tmp_dir, file_name)
        with open(tmp_path, 'wb') as f:
            f.write(file_bytes)
        print(f"[RAG] Ingesting '{file_name}' from memory via temp file...")
        result = ingest_file_from_path(tmp_path, course_id=course_id, user_id=user_id)
        return result
    except Exception as e:
        print(f"[RAG] Error ingesting '{file_name}' from bytes: {e}")
        raise e
    finally:
        if tmp_dir and os.path.exists(tmp_dir):
            try:
                shutil.rmtree(tmp_dir)
            except Exception:
                print(f"[RAG] Warning: Could not clean up temp dir {tmp_dir}")



# Deprecated/Alias for backward compatibility
def ingest_pdf_from_path(file_path: str, course_id: str = None, user_id: str = None):
    return ingest_file_from_path(file_path, course_id, user_id)

def ingest_document(file_upload, user_id: str = None):
    """
    Ingests a PDF document from an uploaded file.
    """
    # Determine extension
    ext = ".pdf"
    if hasattr(file_upload, 'filename'):
        filename = file_upload.filename
        if '.' in filename:
            ext = '.' + filename.split('.')[-1]

    # Save uploaded file temporarily
    with NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        try:
            tmp.write(file_upload.file.read())
            tmp_path = tmp.name
            return ingest_file_from_path(tmp_path, user_id=user_id)
        finally:
            try:
                # Ensure the file is closed before trying to remove it
                pass
                os.unlink(tmp_path)
            except PermissionError:
                # On Windows, sometimes file is still locked.
                print(f"Warning: Could not delete temp file {tmp_path}")

def query_rag_stream(question: str, marks: int = 5, course_id: str = None, user_id: str = None, model: str = None):
    """
    Queries the RAG system and yields tokens as they are generated by the LLM.
    """
    SEP = "=" * 70
    print(f"\n{SEP}")
    print(f"[RAG] 🔍 QUERY RECEIVED")
    print(f"  Question : {question}")
    print(f"  Marks    : {marks}")
    print(f"  Course ID: {course_id}")
    print(f"  Model    : {model or 'default (deepseek-r1:1.5b)'}")
    print(SEP)

    print(f"[RAG] ⚙️  Initializing LLM ({model or 'default'})...")
    llm = get_llm(model_override=model)
    print(f"[RAG] ✅ LLM ready. Now retrieving documents from ChromaDB...")
    
    # Configure MMR (Maximal Marginal Relevance) for better diversity and relevance
    search_kwargs = {"k": 10, "fetch_k": 30}
    
    # Construct filter for ChromaDB
    filters = {}
    if course_id:
        filters["course_id"] = course_id
    if user_id:
        filters["user_id"] = user_id
        
    if filters:
        if len(filters) > 1:
            # Chroma handles $and naturally or can just pass the dict directly
            search_kwargs["filter"] = {"$and": [{k: v} for k, v in filters.items()]}
        else:
            search_kwargs["filter"] = filters
        
    retriever = get_vector_store().as_retriever(
        search_type="mmr",
        search_kwargs=search_kwargs
    )

    # ── DEBUG: show retrieved chunks before building the prompt ──────────────
    _raw_docs = retriever.invoke(question)
    print(f"\n[RAG] 📄 RETRIEVED {len(_raw_docs)} CHUNK(S) from ChromaDB")
    print("-" * 70)
    for i, doc in enumerate(_raw_docs, start=1):
        src  = doc.metadata.get("source", "unknown")
        page = doc.metadata.get("page", "?")
        cid  = doc.metadata.get("course_id", "—")
        snippet = doc.page_content.replace("\n", " ").strip()[:200]
        print(f"  Chunk {i}/{len(_raw_docs)}")
        print(f"    Source    : {src}")
        print(f"    Page      : {page}")
        print(f"    Course ID : {cid}")
        print(f"    Snippet   : {snippet}...")
        print()
    if not _raw_docs:
        print("  ⚠️  No chunks found — LLM will respond with 'cannot answer'.")
    print("-" * 70)
    # ────────────────────────────────────────────────────────────────────────

    # Define length instruction and formatting
    format_instruction = ""
    marks_val = str(marks).strip()
    
    if marks_val in ["2", "5", "10", 2, 5, 10]:
        marks_int = int(marks_val)
        if marks_int == 2:
            length_instruction = "Answer in 7 to 10 lines. Detail the points clearly."
            format_instruction = """
Use this exact exam format. Each section MUST be on its own NEW LINE:
**Definition:** 2 lines of definition
**Key Points:** 3-4 lines with bullet points
**Example/Application:** 1-2 lines with an example
**Conclusion:** 1 line

IMPORTANT: Put each section on a separate line. Do NOT run them together."""
        elif marks_int == 5:
            length_instruction = "Answer in 20 to 25 lines. Cover the topic comprehensively."
            format_instruction = """
Use this exact exam format. Each section MUST start on a NEW LINE:
**Topic:** name of topic
**Definition:** 3-4 line definition
**Types/Categories:**
- Type 1: description
- Type 2: description
- Type 3: description
**Working/Explanation:** 5-6 lines explaining how it works
**Advantages/Significance:**
- Point 1
- Point 2
**Conclusion:** 1-2 lines

IMPORTANT: Every heading and bullet MUST be on its own line. Do NOT merge sections."""
        elif marks_int == 10:
            length_instruction = "Answer in 40 to 45 lines. Provide an extremely detailed and comprehensive explanation."
            format_instruction = """
Use this exact exam format. Every section and bullet MUST be on its own NEW LINE:
**Topic:** name of topic
**Introduction & Definition:** 4-5 line detailed definition and background
**Types/Classification:**
1. Type 1: detailed description
2. Type 2: detailed description
3. Type 3: detailed description
**Detailed Explanation/Working:** 10-12 lines of in-depth explanation
**Advantages:**
- Advantage 1 (detailed)
- Advantage 2 (detailed)
- Advantage 3 (detailed)
**Disadvantages/Limitations:**
- Limitation 1 (detailed)
- Limitation 2 (detailed)
**Applications/Examples:** 4-5 lines with real-world use cases
**Conclusion:** 2-3 concluding lines

IMPORTANT: Every heading, numbered point, and bullet MUST be on its own line. Do NOT merge sections."""
    elif marks_val == "1" or marks_val == 1:
        length_instruction = "Answer in EXACTLY 2 lines. One definition line and one example/use-case line."
    else:
        length_instruction = "Answer in a moderate paragraph."

    template = f"""You are a strict academic teaching assistant.
    Answer the question based ONLY on the following context.
    Under NO CIRCUMSTANCES should you use outside knowledge to answer the question.
    If the provided context does not contain the answer, you MUST reply exactly with: 
    "I cannot answer this based on the provided materials."
    
    When answering, you MUST cite the source of your information at the end of your response using the filename(s) found in the context metadata. Example: "Source: lecture1.pdf"

    Context:
    {{context}}
    
    Question: {{question}}
    
    Instruction: {length_instruction}
    {format_instruction}
    """
    
    prompt = ChatPromptTemplate.from_template(template)
    
    def format_docs(docs):
        # Flatten the documents into a string but inject source metadata for the LLM
        lines = []
        for doc in docs:
            source = doc.metadata.get("source", "Unknown Document")
            page = doc.metadata.get("page", "Unknown Page")
            lines.append(f"[Source: {{source}}, Page: {{page}}]\n{{doc.page_content}}\n---\n")
        return "".join(lines)
    
    chain = (
        {"context": retriever | format_docs, "question": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )

    # ── DEBUG: stream tokens and print each one to terminal ─────────────────
    print(f"[RAG] 🤖 LLM STREAMING — tokens below:")
    print("-" * 70)
    token_count = 0
    for chunk in chain.stream(question):
        print(chunk, end="", flush=True)   # live token output
        token_count += 1
        yield chunk
    print(f"\n{'-' * 70}")
    print(f"[RAG] ✅ Stream complete. Total token chunks emitted: {token_count}")
    print("=" * 70 + "\n")
    # ────────────────────────────────────────────────────────────────────────

def query_rag(question: str, marks: int = 5, course_id: str = None, user_id: str = None):
    """
    Non-streaming fallback (deprecated).
    """
    response = ""
    for chunk in query_rag_stream(question, marks, course_id, user_id):
        response += chunk
    return response

def delete_course_data(course_id: str):
    """
    Deletes all data associated with a specific course_id.
    """
    try:
        print(f"Deleting data for course: {course_id}")
        vs = get_vector_store()
        
        results = vs.get(where={"course_id": course_id})
        ids_to_delete = results.get("ids", [])
        
        if ids_to_delete:
            vs.delete(ids_to_delete)
            print(f"Deleted {len(ids_to_delete)} chunks for course {course_id}")
        else:
            print(f"No chunks found for course {course_id}")
            
        return True
    except Exception as e:
        print(f"Error deleting course data: {e}")
        return False
