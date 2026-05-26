from app.database import engine
from app.models.evaluation import Base

Base.metadata.create_all(bind=engine)

print("Tables created successfully.")