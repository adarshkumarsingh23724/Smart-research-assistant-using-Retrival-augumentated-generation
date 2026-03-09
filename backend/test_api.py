import sys
sys.path.append("d:/projects/Smart-Research-Assistant-using-RAG/backend")
import google_classroom as gc

creds, email = gc.authenticate("adarsh23241a1266@grietcollege.com")
service = gc.get_classroom_service(creds)

courses = gc.list_courses(service)
for c in courses[:2]:
    print(f"Course: {c['name']} (ID: {c['id']})")
    try:
        materials = gc.list_course_materials(service, c['id'])
        print(f"  Materials: {len(materials)}")
    except Exception as e:
        print(f"  Materials Error: {e}")
        
    try:
        work = gc.list_course_work(service, c['id'])
        print(f"  Coursework: {len(work)}")
    except Exception as e:
        print(f"  Coursework Error: {e}")
