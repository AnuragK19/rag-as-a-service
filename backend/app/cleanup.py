"""
Cleanup Module
Session cleanup with APScheduler cron job for automatic expiration.
"""
import os
import sqlite3
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional
from apscheduler.schedulers.background import BackgroundScheduler

from . import vector_store

# Session expiry time in minutes
SESSION_EXPIRY_MINUTES = 30

# Paths
DB_PATH = "data/sessions.db"
TEMP_PDF_PATH = "temp_pdfs"

# Global scheduler
_scheduler: BackgroundScheduler = None


def init_db() -> None:
    """Initialize the SQLite database for session tracking."""
    db_dir = Path(DB_PATH).parent
    db_dir.mkdir(parents=True, exist_ok=True)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            pdf_filename TEXT
        )
    """)
    
    conn.commit()
    conn.close()


def register_session(session_id: str, pdf_filename: str = None) -> None:
    """
    Register a new session in the database.
    
    Args:
        session_id: Unique session identifier
        pdf_filename: Optional filename of the uploaded PDF
    """
    init_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT OR REPLACE INTO sessions (session_id, created_at, last_accessed, pdf_filename)
        VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)
    """, (session_id, pdf_filename))
    
    conn.commit()
    conn.close()


def update_session_access(session_id: str) -> None:
    """
    Update the last_accessed timestamp for a session.
    
    Args:
        session_id: Unique session identifier
    """
    init_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE sessions SET last_accessed = CURRENT_TIMESTAMP
        WHERE session_id = ?
    """, (session_id,))
    
    conn.commit()
    conn.close()


def get_expired_sessions() -> List[dict]:
    """
    Get all sessions that have expired (older than SESSION_EXPIRY_MINUTES).
    
    Returns:
        List of expired session dictionaries
    """
    init_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    expiry_time = datetime.utcnow() - timedelta(minutes=SESSION_EXPIRY_MINUTES)
    
    cursor.execute("""
        SELECT session_id, pdf_filename FROM sessions
        WHERE last_accessed < ?
    """, (expiry_time.isoformat(),))
    
    rows = cursor.fetchall()
    conn.close()
    
    return [{"session_id": row[0], "pdf_filename": row[1]} for row in rows]


def delete_session(session_id: str) -> None:
    """
    Delete a session and all associated data.
    
    Args:
        session_id: Unique session identifier
    """
    # Delete from ChromaDB
    vector_store.delete_collection(session_id)
    
    # Delete temp PDF file
    pdf_path = Path(TEMP_PDF_PATH) / f"{session_id}.pdf"
    if pdf_path.exists():
        pdf_path.unlink()
    
    # Delete from SQLite
    init_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("DELETE FROM sessions WHERE session_id = ?", (session_id,))
    
    conn.commit()
    conn.close()


def cleanup_expired_sessions() -> int:
    """
    Delete all expired sessions. Called by the scheduler.
    
    Returns:
        Number of sessions cleaned up
    """
    expired = get_expired_sessions()
    count = 0
    
    for session in expired:
        try:
            delete_session(session["session_id"])
            count += 1
            print(f"[Cleanup] Deleted expired session: {session['session_id']}")
        except Exception as e:
            print(f"[Cleanup] Error deleting session {session['session_id']}: {e}")
    
    if count > 0:
        print(f"[Cleanup] Cleaned up {count} expired sessions")
    
    return count


def start_scheduler() -> BackgroundScheduler:
    """
    Start the background scheduler for automatic cleanup.
    
    Returns:
        The scheduler instance
    """
    global _scheduler
    
    if _scheduler is not None:
        return _scheduler
    
    _scheduler = BackgroundScheduler()
    
    # Run cleanup every 30 minutes
    _scheduler.add_job(
        cleanup_expired_sessions,
        'interval',
        minutes=30,
        id='cleanup_sessions',
        replace_existing=True
    )
    
    _scheduler.start()
    print("[Cleanup] Scheduler started - running every 30 minutes")
    
    return _scheduler


def stop_scheduler() -> None:
    """Stop the background scheduler."""
    global _scheduler
    
    if _scheduler is not None:
        _scheduler.shutdown()
        _scheduler = None
        print("[Cleanup] Scheduler stopped")


def get_session_count() -> int:
    """
    Get the total number of active sessions.
    
    Returns:
        Number of active sessions
    """
    init_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM sessions")
    count = cursor.fetchone()[0]
    
    conn.close()
    return count
