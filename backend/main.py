from fastapi import FastAPI, UploadFile, File, HTTPException, Response, Request
from pydantic import BaseModel
from rag import ingest_document, query_rag
import os
import sys
import asyncio

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# Patch socket.getaddrinfo to fix WinError 10060 timeouts caused by IPv6 blackholing
import socket
original_getaddrinfo = socket.getaddrinfo
def getaddrinfo_ipv4_only(*args, **kwargs):
    responses = original_getaddrinfo(*args, **kwargs)
    return [res for res in responses if res[0] == socket.AF_INET]
socket.getaddrinfo = getaddrinfo_ipv4_only

import google_classroom as gc
from dotenv import load_dotenv

load_dotenv()

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Smart Research Assistant API")

# Fixed CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False, # Wildcard origins cannot be used with credentials=True
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print("!!! VALIDATION ERROR !!!")
    print(f"URL: {request.url}")
    print(f"Body details: {exc}")
    try:
        body = await request.body()
        print(f"Raw Body Preview: {body[:200]}")
    except:
        pass
    return JSONResponse(
        status_code=422,
        content={"detail": "Validation Error", "body": str(exc)},
    )

from course_manager import get_courses_list, get_course_files, sync_full_course_data, get_course_metadata, download_all_course_materials
from typing import Optional, Union

class QueryRequest(BaseModel):
    question: str
    marks: Union[int, str] = 5
    course_id: Optional[str] = None
    model: Optional[str] = None

@app.get("/")
async def read_root():
    return {"message": "Smart Research Assistant API is running"}

# --- Authentication Endpoints ---
from fastapi.responses import RedirectResponse

@app.get("/api/auth/login")
async def auth_login():
    """Starts the Google OAuth2 flow"""
    auth_url, state = gc.get_auth_url()
    return {"auth_url": auth_url}

@app.get("/api/auth/callback")
async def auth_callback(request: Request, code: Optional[str] = None, error: Optional[str] = None):
    """Google redirects here after consent screen"""
    if error:
        return RedirectResponse(f"http://localhost:5173/?auth=error&msg={error}")
    
    if not code:
        return RedirectResponse("http://localhost:5173/?auth=error&msg=No_code_provided")
        
    try:
        full_url = str(request.url)
        # Handle the callback to get tokens
        gc.handle_auth_callback(full_url)
        return RedirectResponse("http://localhost:5173/?auth=success")
    except Exception as e:
        import traceback
        traceback.print_exc()
        return RedirectResponse(f"http://localhost:5173/?auth=error&msg={str(e)}")

@app.get("/api/auth/status")
async def auth_status():
    """Checks if a user is logged in"""
    creds, user_info = gc.get_current_user()
    if creds and creds.valid:
        return {
            "authenticated": True, 
            "user": user_info
        }
    return {"authenticated": False}

@app.post("/api/auth/logout")
async def auth_logout():
    """Logs out the current user by deleting their token"""
    creds, user_info = gc.get_current_user()
    if user_info and 'email' in user_info:
        gc.logout(user_info['email'])
    return {"status": "logged_out"}

# --- Course Management Endpoints ---

@app.get("/api/courses")
async def get_all_courses():
    creds, user_info = gc.get_current_user()
    email = user_info.get("email") if user_info else None
    courses = get_courses_list(email=email)
    return {"courses": courses}

@app.get("/api/courses/{course_id}")
async def get_course_details(course_id: str):
    creds, user_info = gc.get_current_user()
    email = user_info.get("email") if user_info else None
    courses = get_courses_list(email=email)
    course = next((c for c in courses if c['id'] == course_id), None)

    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Fetch live metadata from Google Classroom (no local cache)
    metadata = get_course_metadata(course_id, email=email)
    files = get_course_files(course_id)  # from ChromaDB

    if not metadata:
        metadata = {"announcements": [], "coursework": [], "materials": [], "local_files": files}
    else:
        metadata["local_files"] = files

    return {**course, "metadata": metadata}

@app.get("/api/courses/{course_id}/stream")
async def get_course_stream(course_id: str):
    creds, user_info = gc.get_current_user()
    email = user_info.get("email") if user_info else None
    # Fetch live from Google Classroom
    metadata = get_course_metadata(course_id, email=email)
    if not metadata:
        return {"posts": []}

    announcements = [{"type": "announcement", **a} for a in metadata.get("announcements", [])]
    coursework    = [{"type": "coursework",   **c} for c in metadata.get("coursework", [])]
    materials     = [{"type": "material",     **m} for m in metadata.get("materials", [])]

    all_posts = announcements + coursework + materials
    all_posts.sort(
        key=lambda x: x.get("updateTime", x.get("creationTime", "")),
        reverse=True
    )
    return {"posts": all_posts}

@app.get("/api/courses/{course_id}/classwork")
async def get_course_classwork(course_id: str):
    creds, user_info = gc.get_current_user()
    email = user_info.get("email") if user_info else None
    # Fetch live from Google Classroom
    metadata = get_course_metadata(course_id, email=email)
    files = get_course_files(course_id)  # from ChromaDB
    return {
        "coursework": metadata.get("coursework", []) if metadata else [],
        "materials": metadata.get("materials", []) if metadata else [],
        "local_files": files
    }


from fastapi import BackgroundTasks

def background_sync_task(course_id: str, force: bool, email: str = None):
    try:
        from course_manager import download_all_course_materials
        print(f"[Sync] Starting background sync for course {course_id}...")
        # Download all Drive files from GC into memory, ingest into ChromaDB
        download_all_course_materials(course_id, email=email)
        print(f"[Sync] Background sync finished for {course_id}.")
    except Exception as e:
        print(f"[Sync] Background sync failed for {course_id}: {e}")

@app.post("/api/courses/{course_id}/sync")
async def sync_course(course_id: str, background_tasks: BackgroundTasks, force: bool = False):
    creds, user_info = gc.get_current_user()
    email = user_info.get("email") if user_info else None
    
    # Queue the sync task and return immediately
    background_tasks.add_task(background_sync_task, course_id, force, email)
    
    return {
        "status": "accepted", 
        "message": "Sync started in background. Refresh page in a few minutes to see new files."
    }

@app.get("/api/courses/{course_id}/files")
def get_files(course_id: str):
    """Returns files embedded in ChromaDB for this course (no disk lookup)."""
    files = get_course_files(course_id)
    return {"embedded_files": files}

@app.post("/api/courses/{course_id}/ingest-file")
def ingest_specific_file(course_id: str, file_name: str):
    """
    Finds the file_id for the given file_name in the course's GC metadata,
    then downloads it to memory and ingests it into ChromaDB.
    """
    from course_manager import get_course_metadata, embed_specific_file
    creds, user_info = gc.get_current_user()
    email = user_info.get("email") if user_info else None
    
    metadata = get_course_metadata(course_id, email=email)
    if not metadata:
        raise HTTPException(status_code=404, detail="Course metadata not found.")
        
    all_items = (
        metadata.get("materials", []) +
        metadata.get("coursework", []) +
        metadata.get("announcements", [])
    )
    
    file_id = None
    for item in all_items:
        for mat in item.get("materials", []):
            drive_file_wrap = mat.get("driveFile", {}).get("driveFile")
            if drive_file_wrap and drive_file_wrap.get("title") == file_name:
                file_id = drive_file_wrap.get("id")
                break
        if file_id:
            break
            
    if not file_id:
        raise HTTPException(status_code=404, detail=f"File '{file_name}' not found in course.")
        
    print(f"[Ingest] Found file '{file_name}' with ID '{file_id}'. Starting ingest...")
    try:
        embed_specific_file(course_id, file_id, file_name, email=email)
    except ValueError as ve:
        # Expected errors, like empty text or unsupported format
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        # Unexpected errors (API failure, etc)
        raise HTTPException(status_code=500, detail=f"Failed to ingest file: {str(e)}")
        
    return {"status": "success", "message": f"Successfully ingested {file_name}"}

import shutil

def background_upload_ingest(course_id: str, file_bytes: bytes, file_name: str, email: str = None):
    """Background task: ingest an uploaded file from memory into ChromaDB (text + vision)."""
    try:
        from rag import ingest_file_from_bytes
        enable_vision = os.getenv("ENABLE_VISION", "true").lower() == "true"
        vision_note = " + 🖼️ vision image analysis" if enable_vision else ""
        print(f"[Upload] Ingesting '{file_name}' for course {course_id}{vision_note}...")
        result = ingest_file_from_bytes(file_bytes, file_name, course_id=course_id, user_id=email)
        total = result.get("chunks_added", 0) if isinstance(result, dict) else 0
        print(f"[Upload] ✅ Successfully ingested '{file_name}' — {total} total chunks.")
    except Exception as e:
        print(f"[Upload] Failed to ingest '{file_name}': {e}")

@app.post("/api/courses/{course_id}/upload")
async def upload_course_file(course_id: str, background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """
    Receives a PDF/document upload, reads it into memory, and ingests
    directly into ChromaDB. No file is saved to disk.
    """
    creds, user_info = gc.get_current_user()
    email = user_info.get("email") if user_info else None

    file_name = file.filename
    if not file_name:
        raise HTTPException(status_code=400, detail="No valid file name provided.")

    try:
        file_bytes = await file.read()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read uploaded file: {str(e)}")

    background_tasks.add_task(background_upload_ingest, course_id, file_bytes, file_name, email)
    return {
        "status": "accepted",
        "message": f"'{file_name}' has been uploaded and is being ingested into the AI memory. This will take a few seconds."
    }

@app.get("/api/sidebar-data")
def get_sidebar_data():
    from course_manager import get_all_embedded_data
    creds, user_info = gc.get_current_user()
    email = user_info.get("email") if user_info else None
    data = get_all_embedded_data(email=email)
    return {"courses": data}

# --- Legacy Ingest Endpoint (kept for compatibility) ---
from typing import List

@app.post("/ingest")
async def ingest_pdfs(documents: List[UploadFile] = File(...)):
    # ... (Keep existing implementation or remove if fully deprecated)
    # For now, let's keep it but ideally we don't use it in V2 frontend
    return {"detail": "This endpoint is deprecated in V2. Use /api/courses/{id}/sync"}

from fastapi.responses import JSONResponse, StreamingResponse
import hashlib
import json

# --- Simple LRU Cache for Queries ---
from collections import OrderedDict

class QueryCache:
    def __init__(self, maxsize=100):
        self.cache = OrderedDict()
        self.maxsize = maxsize
        
    def get_hash(self, question: str, marks: int, course_id: str, model: str):
        key_str = f"{question.strip().lower()}_{marks}_{course_id}_{model}"
        return hashlib.md5(key_str.encode()).hexdigest()
        
    def get(self, key_hash):
        if key_hash in self.cache:
            self.cache.move_to_end(key_hash)
            return self.cache[key_hash]
        return None
        
    def put(self, key_hash, answer: str):
        self.cache[key_hash] = answer
        if len(self.cache) > self.maxsize:
            self.cache.popitem(last=False)

query_cache = QueryCache()

# --- Async Generator for Streaming ---
from rag import query_rag_stream

async def generate_chat_response(request: QueryRequest):
    key_hash = query_cache.get_hash(request.question, request.marks, request.course_id, request.model)
    cached_answer = query_cache.get(key_hash)
    
    if cached_answer:
        print(f"Cache hit for: {request.question}")
        # Yield cached answer split into words for visual effect
        words = cached_answer.split(' ')
        for word in words:
            yield word + ' '
            await asyncio.sleep(0.01) # Small delay to mimic streaming
        return

    print(f"Cache miss. Processing: {request.question} for {request.marks} marks (Course: {request.course_id})")
    full_answer = ""
    # rag.py generator is synchronous, we run it in a thread or just iterate
    # Technically it's a blocking generator, but for local tests it's okay. 
    # To truly unblock FastAPI, we'd use run_in_executor, but this works for demonstration.
    try:
        for chunk in query_rag_stream(request.question, request.marks, request.course_id, model=request.model):
            full_answer += chunk
            yield chunk
            await asyncio.sleep(0.005) # Yield control
            
        # Cache the final assembled answer
        query_cache.put(key_hash, full_answer)
        
    except Exception as e:
        print(f"Streaming error: {e}")
        if "invalid_api_key" in str(e).lower():
            yield "\n\n[Error: Invalid GROQ_API_KEY. Please check your .env file.]"
        else:
            yield f"\n\n[Error: {str(e)}]"

@app.post("/ask/stream")
async def ask_question_stream(request: QueryRequest):
    return StreamingResponse(generate_chat_response(request), media_type="text/event-stream")

# Keep legacy endpoint for backward compatibility
@app.post("/ask")
async def ask_question(request: QueryRequest):
    try:
        from rag import query_rag
        answer = query_rag(request.question, request.marks, request.course_id)
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class AssessmentRequest(BaseModel):
    topic: str
    type: str = "quiz" # "quiz" or "flashcard"
    count: Optional[int] = 5
    model: Optional[str] = None
    fileName: Optional[str] = None

@app.post("/api/courses/{course_id}/assessment")
async def generate_course_assessment(course_id: str, request: AssessmentRequest):
    try:
        from rag import generate_assessment
        result_json = generate_assessment(
            topic=request.topic,
            course_id=course_id,
            assessment_type=request.type,
            count=request.count,
            model=request.model,
            file_name=request.fileName
        )
        return json.loads(result_json)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse LLM output as JSON.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
