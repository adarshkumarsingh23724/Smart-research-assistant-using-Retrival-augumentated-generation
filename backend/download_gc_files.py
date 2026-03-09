"""
download_gc_files.py
====================
Reads each course's metadata.json, downloads every Drive file attached to
announcements / coursework / materials from Google Drive, then deletes any
old locally-stored files that are NOT in the GC metadata.

Run from the backend directory (after running fetch_all_content.py):
    python download_gc_files.py
"""

import os
import sys
import json
import io
import time
import traceback

BASE_DIR     = os.path.dirname(os.path.abspath(__file__))
COURSES_DIR  = os.path.join(BASE_DIR, "data", "courses")
TOKENS_DIR   = os.path.join(BASE_DIR, "tokens")
CREDS_FILE   = os.path.join(BASE_DIR, "credentials.json")

SCOPES = [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/classroom.courses.readonly",
    "https://www.googleapis.com/auth/classroom.announcements.readonly",
    "https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly",
    "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
    "https://www.googleapis.com/auth/classroom.coursework.students.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "openid",
]

# Extensions we care about for RAG
WANTED_EXTS = {".pdf", ".docx", ".doc", ".pptx", ".ppt", ".txt", ".rtf"}

# Extensions we definitely want to skip downloading (videos, audio, large media)
SKIP_EXTS = {".mp4", ".mov", ".avi", ".mkv", ".webm", ".wmv", ".mp3", ".wav", ".zip", ".rar"}

# Google export MIME types → preferred download format
EXPORT_MAP = {
    "application/vnd.google-apps.document":
        ("application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx"),
    "application/vnd.google-apps.presentation":
        ("application/vnd.openxmlformats-officedocument.presentationml.presentation", ".pptx"),
    "application/vnd.google-apps.spreadsheet":
        ("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx"),
}

# ── Auth ──────────────────────────────────────────────────────────────────────

def get_credentials():
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow

    creds = None
    token_files = [f for f in os.listdir(TOKENS_DIR) if f.endswith(".json")]
    if token_files:
        tp = os.path.join(TOKENS_DIR, token_files[0])
        try:
            creds = Credentials.from_authorized_user_file(tp, SCOPES)
        except Exception:
            creds = None

    if creds and creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
        except Exception:
            creds = None

    if not creds or not creds.valid:
        print("[auth] Opening browser for Google Sign-In…")
        os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"
        os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"]  = "1"
        flow  = InstalledAppFlow.from_client_secrets_file(CREDS_FILE, SCOPES)
        creds = flow.run_local_server(port=0)

    return creds


# ── Drive download ────────────────────────────────────────────────────────────

def download_drive_file(drive_service, file_id, file_name, dest_dir):
    """Download a single Drive file. Handles Google Docs export."""
    from googleapiclient.http import MediaIoBaseDownload

    # Skip files we don't want
    ext = os.path.splitext(file_name)[1].lower()
    if ext in SKIP_EXTS:
        print(f"      ⊘ Skipping video/media file: {file_name}")
        return None, False

    dest_path = os.path.join(dest_dir, file_name)
    if os.path.exists(dest_path):
        return dest_path, False  # already present

    try:
        # Get file metadata first to check MIME type
        meta = drive_service.files().get(fileId=file_id, fields="mimeType,name").execute()
        mime = meta.get("mimeType", "")

        if mime in EXPORT_MAP:
            export_mime, ext = EXPORT_MAP[mime]
            base = os.path.splitext(file_name)[0]
            file_name = base + ext
            dest_path = os.path.join(dest_dir, file_name)
            request = drive_service.files().export_media(fileId=file_id, mimeType=export_mime)
        else:
            request = drive_service.files().get_media(fileId=file_id)

        fh       = io.FileIO(dest_path, "wb")
        dl       = MediaIoBaseDownload(fh, request)
        done     = False
        while not done:
            _, done = dl.next_chunk()
        fh.close()
        return dest_path, True

    except Exception as e:
        print(f"      ✗ Download failed for {file_name}: {e}")
        if os.path.exists(dest_path):
            os.remove(dest_path)
        return None, False


# ── Collect all Drive files from metadata ────────────────────────────────────

def collect_drive_files(metadata, drive_service):
    """Return list of (file_id, file_name) tuples from all sections."""
    seen = set()
    files = []

    def add(mat):
        df = mat.get("driveFile", {}).get("driveFile")
        if df:
            fid   = df.get("id")
            fname = df.get("title")
            
            if fid and fid not in seen:
                # If we don't have a title in metadata, query Drive API for it
                if not fname or fname == "unknown":
                    try:
                        meta = drive_service.files().get(fileId=fid, fields="name").execute()
                        fname = meta.get("name", f"file_{fid}")
                    except Exception as e:
                        print(f"      [warn] Could not get title for {fid}: {e}")
                        fname = f"file_{fid}"

                # Early filter to save array space
                ext = os.path.splitext(fname)[1].lower()
                if ext not in SKIP_EXTS:
                    seen.add(fid)
                    files.append((fid, fname))

    for section in ("announcements", "coursework", "materials"):
        for item in metadata.get(section, []):
            for mat in item.get("materials", []):
                add(mat)

    return files


# ── Per-course processing ─────────────────────────────────────────────────────

def process_course(drive_service, course_id):
    course_dir    = os.path.join(COURSES_DIR, course_id)
    metadata_path = os.path.join(course_dir, "metadata.json")

    if not os.path.exists(metadata_path):
        return 0, 0, 0  # no metadata

    with open(metadata_path, encoding="utf-8") as f:
        metadata = json.load(f)

    course_name = metadata.get("name", course_id)
    print(f"\n  [{course_id}] {course_name}")

    gc_files = collect_drive_files(metadata, drive_service)
    if not gc_files:
        print("    No Drive attachments found.")
        return 0, 0, 0

    # Download
    gc_file_names = set()
    downloaded = 0
    skipped    = 0

    for file_id, file_name in gc_files:
        dest_path, is_new = download_drive_file(drive_service, file_id, file_name, course_dir)
        
        # Determine actual filename saved/checked
        if dest_path:
            actual_name = os.path.basename(dest_path)
            gc_file_names.add(actual_name)
        else:
            actual_name = file_name
            gc_file_names.add(actual_name)
            
        # Safe print for Windows console
        safe_name = actual_name.encode('ascii', 'replace').decode('ascii')
        
        if is_new:
            print(f"    ↓ {safe_name}")
            downloaded += 1
        elif dest_path: # Means it already existed and wasn't skipped due to extension
            skipped += 1

    # Delete old files NOT from GC
    deleted = 0
    existing = [f for f in os.listdir(course_dir)
                if os.path.isfile(os.path.join(course_dir, f)) and f != "metadata.json"]

    for fname in existing:
        if fname not in gc_file_names:
            ext = os.path.splitext(fname)[1].lower()
            if ext in WANTED_EXTS or ext in {".pot", ".pps", ".potx"}:
                os.remove(os.path.join(course_dir, fname))
                print(f"    🗑  Deleted old file: {fname}")
                deleted += 1

    print(f"    ✓ downloaded={downloaded}  skipped={skipped}  deleted={deleted}")
    return downloaded, skipped, deleted


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    from googleapiclient.discovery import build

    print("=" * 60)
    print("  Google Drive — Download All Attached Files")
    print("=" * 60)

    if not os.path.exists(CREDS_FILE):
        print(f"[ERROR] credentials.json not found at {CREDS_FILE}")
        sys.exit(1)

    creds         = get_credentials()
    drive_service = build("drive", "v3", credentials=creds)

    course_ids = [
        d for d in os.listdir(COURSES_DIR)
        if os.path.isdir(os.path.join(COURSES_DIR, d))
    ]
    print(f"\n[info] Processing {len(course_ids)} course directories…\n")

    total_dl  = 0
    total_sk  = 0
    total_del = 0

    for cid in sorted(course_ids):
        try:
            dl, sk, de = process_course(drive_service, cid)
            total_dl  += dl
            total_sk  += sk
            total_del += de
            time.sleep(0.2)
        except Exception as e:
            print(f"  [ERROR] {cid}: {e}")
            traceback.print_exc()

    print("\n" + "=" * 60)
    print(f"  All done!")
    print(f"  ↓ Downloaded : {total_dl} new files")
    print(f"  ⏭  Skipped   : {total_sk} already present")
    print(f"  🗑  Deleted   : {total_del} old files")
    print("  Refresh the web app to see updated content.")
    print("=" * 60)


if __name__ == "__main__":
    main()
