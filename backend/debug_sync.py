import os
import sys
import json
import traceback

# Add backend to sys.path
backend_path = os.path.dirname(os.path.abspath(__file__))
sys.path.append(backend_path)

import google_classroom as gc
from course_manager import sync_full_course_data

def debug_sync(course_id):
    print(f"Starting debug sync for course: {course_id}")
    try:
        # Step 1: Auth
        print("Testing authentication...")
        creds, email = gc.authenticate()
        print(f"Authenticated as: {email}")
        
        # Step 2: Service
        print("Getting classroom service...")
        service = gc.get_classroom_service(creds)
        
        # Step 3: Fetch Course
        print("Fetching course info...")
        course_info = service.courses().get(id=course_id).execute()
        print(f"Course name: {course_info.get('name')}")
        
        # Step 4: Run full sync
        print("Running full sync_full_course_data...")
        metadata = sync_full_course_data(course_id, email=email)
        
        if metadata:
            print("Sync successful!")
            print(f"Announcements: {len(metadata.get('announcements', []))}")
            print(f"Coursework: {len(metadata.get('coursework', []))}")
            print(f"Materials: {len(metadata.get('materials', []))}")
        else:
            print("Sync returned None.")
            
    except Exception as e:
        print(f"Caught exception in debug_sync: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    # Test with one of the user's course IDs
    debug_sync('824043386993')
