"""
fetch_all_content.py
====================
One-shot script: authenticates with Google, then fetches ALL content
(announcements, coursework, materials) from every course and saves it
as data/courses/<course_id>/metadata.json so the web app can display it.

Run once from the backend directory:
    python fetch_all_content.py

It will open your browser for Google Sign-In on first run.
"""

import os
import sys
import json
import time
import traceback

# ── Path setup ────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
COURSES_DIR = os.path.join(BASE_DIR, "data", "courses")
CREDENTIALS_FILE = os.path.join(BASE_DIR, "credentials.json")
TOKENS_DIR = os.path.join(BASE_DIR, "tokens")
os.makedirs(TOKENS_DIR, exist_ok=True)
os.makedirs(COURSES_DIR, exist_ok=True)

# ── Scopes ────────────────────────────────────────────────────────────────────
SCOPES = [
    "https://www.googleapis.com/auth/classroom.courses.readonly",
    "https://www.googleapis.com/auth/classroom.announcements.readonly",
    "https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly",
    "https://www.googleapis.com/auth/classroom.coursework.students.readonly",
    "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "openid",
]

# ── Auth ──────────────────────────────────────────────────────────────────────

def authenticate():
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow

    creds = None

    # Try any existing token first
    token_files = [f for f in os.listdir(TOKENS_DIR) if f.endswith(".json")]
    if token_files:
        token_path = os.path.join(TOKENS_DIR, token_files[0])
        try:
            creds = Credentials.from_authorized_user_file(token_path, SCOPES)
        except Exception as e:
            print(f"[warn] Could not load existing token: {e}")
            creds = None

    # Refresh if expired
    if creds and creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
            print("[auth] Token refreshed successfully.")
        except Exception as e:
            print(f"[warn] Token refresh failed: {e}")
            creds = None

    # Full OAuth flow if needed
    if not creds or not creds.valid:
        print("\n[auth] Opening browser for Google Sign-In...")
        os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"
        os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"
        flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
        creds = flow.run_local_server(port=0, open_browser=True)
        print("[auth] Sign-in successful!")

    # Identify user and save token
    email = "default_user"
    try:
        from googleapiclient.discovery import build
        user_info = build("oauth2", "v2", credentials=creds).userinfo().get().execute()
        email = user_info.get("email", "default_user")
        print(f"[auth] Signed in as: {email}")
    except Exception:
        pass

    token_path = os.path.join(TOKENS_DIR, f"{email}.json")
    with open(token_path, "w") as f:
        f.write(creds.to_json())
    print(f"[auth] Token saved → {token_path}")

    return creds, email


# ── Helpers ───────────────────────────────────────────────────────────────────

def safe_list(fn, label):
    """Call a GC API list and swallow errors, returning []."""
    try:
        return fn()
    except Exception as e:
        print(f"  [skip] {label}: {e}")
        return []


def paginate(list_fn, key, **kwargs):
    """Collect all pages of a GC list call."""
    results = []
    page_token = None
    while True:
        resp = list_fn(pageToken=page_token, **kwargs).execute()
        results.extend(resp.get(key, []))
        page_token = resp.get("nextPageToken")
        if not page_token:
            break
    return results


# ── Per-course sync ───────────────────────────────────────────────────────────

def sync_course(service, course_id, course_name):
    print(f"\n  Syncing: {course_name} ({course_id})")

    course_dir = os.path.join(COURSES_DIR, course_id)
    os.makedirs(course_dir, exist_ok=True)

    # Basic info
    course_info = safe_list(
        lambda: service.courses().get(id=course_id).execute(),
        "course info"
    ) or {}

    # Announcements
    announcements = safe_list(
        lambda: paginate(
            lambda **kw: service.courses().announcements().list(courseId=course_id, **kw),
            "announcements"
        ),
        "announcements"
    )
    print(f"    announcements : {len(announcements)}")

    # Coursework (assignments / quizzes)
    coursework = safe_list(
        lambda: paginate(
            lambda **kw: service.courses().courseWork().list(courseId=course_id, **kw),
            "courseWork"
        ),
        "coursework"
    )
    print(f"    coursework    : {len(coursework)}")

    # Materials
    materials = safe_list(
        lambda: paginate(
            lambda **kw: service.courses().courseWorkMaterials().list(courseId=course_id, **kw),
            "courseWorkMaterial"
        ),
        "materials"
    )
    print(f"    materials     : {len(materials)}")

    metadata = {
        "id": course_id,
        "name": course_info.get("name", course_name),
        "section": course_info.get("section", ""),
        "description": course_info.get("description", ""),
        "room": course_info.get("room", ""),
        "announcements": announcements,
        "coursework": coursework,
        "materials": materials,
        "last_sync": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

    metadata_path = os.path.join(course_dir, "metadata.json")
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)

    print(f"    ✓ Saved → {metadata_path}")
    return metadata


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    from googleapiclient.discovery import build

    print("=" * 60)
    print("  Google Classroom — Full Content Fetcher")
    print("=" * 60)

    if not os.path.exists(CREDENTIALS_FILE):
        print(f"\n[ERROR] credentials.json not found at:\n  {CREDENTIALS_FILE}")
        print("Download it from Google Cloud Console → APIs & Services → Credentials.")
        sys.exit(1)

    # Auth
    creds, email = authenticate()
    service = build("classroom", "v1", credentials=creds)

    # Fetch all enrolled courses from GC
    print("\n[fetch] Getting course list from Google Classroom...")
    gc_courses = safe_list(
        lambda: paginate(
            lambda **kw: service.courses().list(
                studentId="me", courseStates=["ACTIVE"], **kw
            ),
            "courses"
        ),
        "course list"
    )

    if not gc_courses:
        print("[warn] No active courses returned for studentId='me'. Trying without filter...")
        gc_courses = safe_list(
            lambda: paginate(
                lambda **kw: service.courses().list(**kw),
                "courses"
            ),
            "course list (unfiltered)"
        )

    if not gc_courses:
        print("[warn] Could not fetch courses from GC. Using local course directories instead.")
        # Fall back to local dirs that already exist
        existing_ids = [d for d in os.listdir(COURSES_DIR) if os.path.isdir(os.path.join(COURSES_DIR, d))]
        gc_courses = [{"id": cid, "name": f"Local Course ({cid})"} for cid in existing_ids]

    print(f"[fetch] Found {len(gc_courses)} courses.\n")

    ok, skipped, failed = 0, 0, 0

    for course in gc_courses:
        course_id   = course.get("id", "")
        course_name = course.get("name", course_id)
        try:
            sync_course(service, course_id, course_name)
            ok += 1
        except Exception as e:
            print(f"  [ERROR] {course_name}: {e}")
            traceback.print_exc()
            failed += 1
        time.sleep(0.3)  # be polite to the API

    print("\n" + "=" * 60)
    print(f"  Done! ✓ {ok} synced  ✗ {failed} failed")
    print("  Refresh the web app to see all stream content.")
    print("=" * 60)


if __name__ == "__main__":
    main()
