import rag
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# course_manager.py  (NO local data/ folder — everything is fetched live
# from Google Classroom and processed in-memory into ChromaDB)
# ---------------------------------------------------------------------------

SUPPORTED_EXTENSIONS = {'pdf', 'docx', 'doc', 'pptx', 'ppt', 'txt'}


# ---------------------------------------------------------------------------
# Course list  (live from GC API)
# ---------------------------------------------------------------------------

def get_courses_list(email: str = None):
    """
    Fetches the live list of enrolled courses from Google Classroom
    using the authenticated user's token.
    """
    import google_classroom as gc
    try:
        creds, user_email = gc.authenticate(email)
        service = gc.get_classroom_service(creds)
        gc_courses = gc.list_courses(service)

        result = []
        for course in gc_courses:
            course_id = course.get("id")
            name = course.get("name", f"Course {course_id}")
            section = course.get("section", "")
            embedded_files = get_course_files(course_id)
            result.append({
                "id": course_id,
                "name": name,
                "section": section,
                "file_count": len(embedded_files),
                "last_sync": course.get("updateTime"),
            })
        return result
    except Exception as e:
        print(f"[CourseManager] Error fetching courses from Google Classroom: {e}")
        return []


# ---------------------------------------------------------------------------
# Files embedded in ChromaDB  (replaces local disk listing)
# ---------------------------------------------------------------------------

def get_course_files(course_id: str):
    """
    Returns the list of file names that have been embedded into ChromaDB
    for this course. Queries the vector store metadata instead of reading disk.
    """
    try:
        vs = rag.get_vector_store()
        results = vs.get(where={"course_id": course_id})
        sources = set()
        for meta in results.get("metadatas", []):
            src = meta.get("source")
            if src:
                sources.add(src)
        return sorted(sources)
    except Exception as e:
        print(f"[CourseManager] Error reading files from ChromaDB for {course_id}: {e}")
        return []


# ---------------------------------------------------------------------------
# Live metadata from GC API  (replaces metadata.json)
# ---------------------------------------------------------------------------

def get_course_metadata(course_id: str, email: str = None):
    """
    Fetches live course metadata (announcements, coursework, materials)
    directly from Google Classroom API. Returns a dict or None on failure.
    """
    import google_classroom as gc
    try:
        creds, _ = gc.authenticate(email)
        service = gc.get_classroom_service(creds)

        course_info = service.courses().get(id=course_id).execute()

        announcements = []
        try:
            announcements = gc.list_announcements(service, course_id)
        except Exception as e:
            print(f"[CourseManager] Warning: Could not fetch announcements: {e}")

        coursework = []
        try:
            coursework = gc.list_course_work(service, course_id)
        except Exception as e:
            print(f"[CourseManager] Warning: Could not fetch coursework: {e}")

        materials = []
        try:
            materials = gc.list_course_materials(service, course_id)
        except Exception as e:
            print(f"[CourseManager] Warning: Could not fetch materials: {e}")

        return {
            "id": course_id,
            "name": course_info.get("name"),
            "section": course_info.get("section", ""),
            "description": course_info.get("description", ""),
            "announcements": announcements,
            "coursework": coursework,
            "materials": materials,
            "last_sync": course_info.get("updateTime"),
        }
    except Exception as e:
        print(f"[CourseManager] Error fetching metadata for {course_id}: {e}")
        return None


# ---------------------------------------------------------------------------
# Sync: Download all Drive files from GC → ingest into ChromaDB in-memory
# ---------------------------------------------------------------------------

def sync_full_course_data(course_id: str, email: str = None):
    """
    Fetches all course metadata live from GC. Returns the metadata dict
    (no local file saved — replaces old metadata.json approach).
    """
    return get_course_metadata(course_id, email=email)


def download_all_course_materials(course_id: str, email: str = None):
    """
    Downloads all Drive files attached to the course (from announcements,
    coursework, materials) directly into memory, then ingests each one
    into ChromaDB via ingest_file_from_bytes().
    No files are written to disk.
    """
    import google_classroom as gc

    metadata = get_course_metadata(course_id, email=email)
    if not metadata:
        print(f"[CourseManager] Could not fetch metadata for {course_id}.")
        return False

    try:
        creds, _ = gc.authenticate(email)
        drive_service = gc.get_drive_service(creds)

        all_items = (
            metadata.get("materials", []) +
            metadata.get("coursework", []) +
            metadata.get("announcements", [])
        )

        already_embedded = set(get_course_files(course_id))
        download_count = 0
        skip_count = 0

        for item in all_items:
            for mat in item.get("materials", []):
                drive_file_wrap = mat.get("driveFile", {}).get("driveFile")
                if not drive_file_wrap:
                    continue

                file_id = drive_file_wrap.get("id")
                file_name = drive_file_wrap.get("title", "")

                if not file_id or not file_name:
                    continue

                ext = file_name.lower().split('.')[-1] if '.' in file_name else ''
                if ext not in SUPPORTED_EXTENSIONS:
                    print(f"[CourseManager] Skipping unsupported file type: {file_name}")
                    continue

                if file_name in already_embedded:
                    print(f"[CourseManager] Already in ChromaDB, skipping: {file_name}")
                    skip_count += 1
                    continue

                print(f"[CourseManager] Downloading to memory: {file_name}")
                file_bytes, _ = gc.download_file_to_memory(drive_service, file_id, file_name)
                if file_bytes:
                    try:
                        rag.ingest_file_from_bytes(
                            file_bytes,
                            file_name,
                            course_id=course_id,
                            user_id=email
                        )
                        already_embedded.add(file_name)
                        download_count += 1
                        print(f"[CourseManager] Ingested: {file_name}")
                    except Exception as e:
                        print(f"[CourseManager] Failed to ingest {file_name}: {e}")
                else:
                    print(f"[CourseManager] Download returned no bytes for: {file_name}")

        print(f"[CourseManager] Sync complete. Ingested: {download_count}, Skipped: {skip_count}")
        return True

    except Exception as e:
        print(f"[CourseManager] Error in download_all_course_materials: {e}")
        return False


# ---------------------------------------------------------------------------
# Embed a specific file by name from GC (used by ingest-file endpoint)
# ---------------------------------------------------------------------------

def embed_specific_file(course_id: str, file_id: str, file_name: str, email: str = None):
    """
    Downloads a single Drive file into memory and ingests it into ChromaDB.
    """
    import google_classroom as gc
    try:
        creds, _ = gc.authenticate(email)
        drive_service = gc.get_drive_service(creds)
        file_bytes, _ = gc.download_file_to_memory(drive_service, file_id, file_name)
        if not file_bytes:
            raise Exception(f"Download returned no bytes for {file_name}")
        rag.ingest_file_from_bytes(file_bytes, file_name, course_id=course_id, user_id=email)
        print(f"[CourseManager] Successfully ingested: {file_name}")
        return True
    except Exception as e:
        print(f"[CourseManager] embed_specific_file error: {e}")
        return False


# ---------------------------------------------------------------------------
# Summary data for sidebar (courses + their embedded files)
# ---------------------------------------------------------------------------

def get_all_embedded_data(email: str = None):
    """
    Returns all courses (from GC API) with the list of files embedded in ChromaDB.
    """
    courses = get_courses_list(email=email)
    result = []
    for course in courses:
        course_id = course['id']
        files = get_course_files(course_id)
        result.append({**course, "files": files, "metadata": None})
    return result
