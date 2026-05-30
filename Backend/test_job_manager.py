from app.services.job_manager import *

job_id = create_job()

print("Job ID:")
print(job_id)

update_job(
    job_id,
    progress=5,
    total=10,
    current_question="What is SQL?"
)

print("\nJob State:")
print(get_job(job_id))