
import os
import sys

# Add the current directory to path
sys.path.append(os.getcwd())

from course_manager import get_courses_list, COURSES_DIR

print(f"COURSES_DIR: {COURSES_DIR}")
print(f"Directory exists: {os.path.exists(COURSES_DIR)}")
if os.path.exists(COURSES_DIR):
    print(f"Contents: {os.listdir(COURSES_DIR)}")

courses = get_courses_list()
print(f"get_courses_list() returned {len(courses)} courses.")
for c in courses[:5]:
    print(f" - {c}")
