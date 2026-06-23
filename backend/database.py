import os
import ssl
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from dotenv import load_dotenv

load_dotenv()

# We use aiomysql as the async driver
# Connection string format: mysql+aiomysql://user:password@host:port/database
# For TiDB Serverless, we need ssl enabled
host = os.getenv("TIDB_HOST", "gateway01.ap-southeast-1.prod.aws.tidbcloud.com")
port = int(os.getenv("TIDB_PORT", 4000))
user = os.getenv("TIDB_USERNAME", "2u2TczwT65g96ET.root")
password = os.getenv("TIDB_PASSWORD", "Fs9jesHk5BPSdF2l")
database = os.getenv("TIDB_DATABASE", "test")
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

database_url = f"mysql+pymysql://{user}:{password}@{host}:{port}/{database}"

engine = create_engine(
    database_url,
    connect_args={
        "ssl_verify_cert": True,
        "ssl_verify_identity": True
    },
    pool_recycle=3600,
    echo=False
)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False
)

def init_tidb():
    from models import Base
    Base.metadata.create_all(engine)
    print("TiDB SQLAlchemy schema initialized successfully.")

def get_db():
    with SessionLocal() as session:
        yield session
