import os
import io
import json
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

# If modifying these scopes, delete all files in the tokens/ directory.
SCOPES = [
    "https://www.googleapis.com/auth/classroom.courses.readonly",
    "https://www.googleapis.com/auth/classroom.announcements.readonly",
    "https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly",
    "https://www.googleapis.com/auth/classroom.coursework.students.readonly",
    "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "openid"
]

CREDENTIALS_FILE = os.path.join(os.path.dirname(__file__), "credentials.json")
TOKENS_DIR = os.path.join(os.path.dirname(__file__), "tokens")
REDIRECT_URI = "http://localhost:8000/api/auth/callback"

if not os.path.exists(TOKENS_DIR):
    os.makedirs(TOKENS_DIR)

def get_token_path(email):
    return os.path.join(TOKENS_DIR, f"{email}.json")

def get_email_from_creds(creds):
    """Safely extracts the user email from credentials."""
    email = "default_user"
    try:
        user_info_service = build("oauth2", "v2", credentials=creds)
        user_info = user_info_service.userinfo().get().execute()
        email = user_info.get('email', 'default_user')
    except Exception as e:
        print(f"Warning: Could not fetch user profile. Error: {e}")
        if hasattr(creds, 'id_token') and creds.id_token:
            try:
                from google.auth.jwt import decode
                decoded = decode(creds.id_token, verify=False)
                if 'email' in decoded:
                    email = decoded['email']
            except Exception as jwt_err:
                print(f"Failed to decode id_token: {jwt_err}")
    return email

def get_user_info(creds):
    """Returns full user profile dict: email, name, picture."""
    try:
        service = build("oauth2", "v2", credentials=creds)
        return service.userinfo().get().execute()
    except Exception as e:
        print(f"Error fetching user info: {e}")
        return {}

def authenticate(email=None):
    """
    Loads credentials for the given email (or first available user).
    Returns (credentials, email) or raises if no valid token exists.
    """
    creds = None

    if email:
        token_path = get_token_path(email)
        if os.path.exists(token_path):
            try:
                creds = Credentials.from_authorized_user_file(token_path, SCOPES)
            except Exception as e:
                print(f"Error loading token for {email}: {e}")
                creds = None
    else:
        # Try the first available token file
        try:
            token_files = [f for f in os.listdir(TOKENS_DIR) if f.endswith(".json")]
            if token_files:
                token_path = os.path.join(TOKENS_DIR, token_files[0])
                creds = Credentials.from_authorized_user_file(token_path, SCOPES)
                # Derive email from filename (strip .json)
                email = token_files[0].replace(".json", "")
        except Exception as e:
            print(f"Error loading default token: {e}")
            creds = None

    # Refresh expired token
    if creds and creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
            # Persist refreshed token
            token_path = get_token_path(email)
            with open(token_path, "w", encoding="utf-8") as f:
                f.write(creds.to_json())
        except Exception as e:
            print(f"Error refreshing token: {e}")
            creds = None

    if not creds or not creds.valid:
        raise Exception("Not authenticated. Please sign in via /api/auth/login.")

    return creds, email

def get_auth_url():
    """Generates the Google OAuth2 authorization URL (web flow)."""
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'
    flow = Flow.from_client_secrets_file(
        CREDENTIALS_FILE,
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI
    )
    auth_url, state = flow.authorization_url(
        access_type='offline',
        prompt='consent',
        include_granted_scopes='true'
    )
    # Save the code_verifier (PKCE) for the callback step
    state_file = os.path.join(TOKENS_DIR, "oauth_state.json")
    with open(state_file, "w") as f:
        json.dump({
            "state": state,
            "code_verifier": getattr(flow, "code_verifier", None)
        }, f)
        
    return auth_url, state

def handle_auth_callback(authorization_response):
    """
    Handles the OAuth2 callback from Google.
    Exchanges the code for tokens, saves them, and returns user info dict.
    """
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'
    os.environ['OAUTHLIB_RELAX_TOKEN_SCOPE'] = '1'

    flow = Flow.from_client_secrets_file(
        CREDENTIALS_FILE,
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI
    )
    
    # Needs the code_verifier from the auth step
    state_file = os.path.join(TOKENS_DIR, "oauth_state.json")
    if os.path.exists(state_file):
        try:
            with open(state_file, "r") as f:
                state_data = json.load(f)
                cv = state_data.get("code_verifier")
                if cv:
                    flow.code_verifier = cv
        except Exception as e:
            print(f"Warning: Could not read OAuth state file: {e}")

    flow.fetch_token(authorization_response=authorization_response)
    creds = flow.credentials

    # Get user info
    user_info = get_user_info(creds)
    email = user_info.get('email', 'default_user')

    # Save token keyed to email
    token_path = get_token_path(email)
    with open(token_path, "w", encoding="utf-8") as f:
        f.write(creds.to_json())

    return user_info

def logout(email):
    """Deletes the token file, effectively logging the user out."""
    if email:
        token_path = get_token_path(email)
        if os.path.exists(token_path):
            os.remove(token_path)
            return True
    return False

def get_current_user():
    """
    Returns (creds, user_info) for the currently signed-in user,
    or (None, None) if nobody is signed in.
    """
    try:
        token_files = [f for f in os.listdir(TOKENS_DIR) if f.endswith(".json")]
        if not token_files:
            return None, None
        email = token_files[0].replace(".json", "")
        creds, _ = authenticate(email=email)
        user_info = get_user_info(creds)
        return creds, user_info
    except Exception:
        return None, None

def get_classroom_service(creds):
    return build("classroom", "v1", credentials=creds)

def get_drive_service(creds):
    return build("drive", "v3", credentials=creds)

def list_courses(service):
    results = service.courses().list(pageSize=50).execute()
    return results.get("courses", [])

def list_course_materials(service, course_id):
    results = service.courses().courseWorkMaterials().list(courseId=course_id).execute()
    return results.get("courseWorkMaterial", [])

def list_course_work(service, course_id):
    results = service.courses().courseWork().list(courseId=course_id).execute()
    return results.get("courseWork", [])

def list_announcements(service, course_id):
    results = service.courses().announcements().list(courseId=course_id).execute()
    return results.get("announcements", [])

def download_file_to_memory(drive_service, file_id, file_name):
    """
    Downloads a Google Drive file directly into memory (BytesIO buffer).
    Returns (bytes, file_name) on success, or (None, file_name) on failure.
    No files are written to disk.
    """
    try:
        request = drive_service.files().get_media(fileId=file_id)
        buffer = io.BytesIO()
        downloader = MediaIoBaseDownload(buffer, request)
        done = False
        while not done:
            status, done = downloader.next_chunk()
        buffer.seek(0)
        print(f"[GC] In-memory download complete: {file_name}")
        return buffer.read(), file_name
    except Exception as e:
        print(f"[GC] Error downloading {file_name} to memory: {e}")
        return None, file_name
