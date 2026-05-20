import os
import uuid
import datetime
import logging

def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    if not logger.handlers:
        logger.setLevel(logging.INFO)
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        ch = logging.StreamHandler()
        ch.setFormatter(formatter)
        logger.addHandler(ch)
    return logger

def timestamp_now() -> str:
    return datetime.datetime.now().isoformat()

def new_session_id() -> str:
    return str(uuid.uuid4())

def safe_filename(filename: str) -> str:
    return os.path.basename(filename).replace(" ", "_")
