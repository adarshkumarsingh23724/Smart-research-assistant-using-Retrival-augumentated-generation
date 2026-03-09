import os
import json
import google_classroom as gc

def test_fetch_materials(course_id):
    try:
        # Load credentials directly
        creds, email = gc.authenticate(None)
        print(f"Authenticated as: {email}")
        
        service = gc.get_classroom_service(creds)
        
        coursework = gc.list_course_work(service, course_id)
        print(f"Coursework for {course_id}: {len(coursework)} items found.")
        if coursework:
            print("First item coursework:", json.dumps(coursework[0], indent=2))
        
        materials = gc.list_course_materials(service, course_id)
        print(f"\nCourse Materials for {course_id}: {len(materials)} items found.")
        if materials:
            print("First item material:", json.dumps(materials[0], indent=2))
            
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_fetch_materials('824043386993')
