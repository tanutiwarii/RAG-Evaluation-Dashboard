from app.db.supabase_client import supabase

response = (
    supabase
    .table("evaluation_runs")
    .select("*")
    .limit(1)
    .execute()
)

print(response.data)