from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Text
)

from app.database import Base


class Evaluation(Base):

    __tablename__ = "evaluations"

    id = Column(Integer, primary_key=True)

    question = Column(Text)

    answer = Column(Text)

    faithfulness = Column(Float)

    answer_relevancy = Column(Float)

    context_utilization = Column(Float)

    latency = Column(Float)