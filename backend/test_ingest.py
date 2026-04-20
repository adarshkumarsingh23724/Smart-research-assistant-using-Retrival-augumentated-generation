import asyncio
import rag

def test_ingest():
    try:
        # Create a dummy text file
        with open("dummy.txt", "w") as f:
            f.write("This is a dummy text file for testing ingestion. It has some text so it shouldn't be empty.")
            
        print("Testing file ingest...")
        res = rag.ingest_file_from_path("dummy.txt", course_id="12345", user_id="test@test.com")
        print("Result:", res)
    except Exception as e:
        print("Error:", e)
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_ingest()
