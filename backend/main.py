from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Any, Optional
import re
import mysql.connector

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="6398",
        database="sports_league_db"
    )

class SqlExecRequest(BaseModel):
    sql: str
    params: Optional[List[Any]] = []

def convert_sqlite_to_mysql(sql: str) -> str:
    mysql_sql = sql.replace("?", "%s")
    mysql_sql = re.sub(r"date\(\s*'now'\s*\)", "CURDATE()", mysql_sql, flags=re.IGNORECASE)
    mysql_sql = re.sub(r"datetime\(\s*'now'\s*\)", "NOW()", mysql_sql, flags=re.IGNORECASE)
    mysql_sql = re.sub(r'\b(INTO|UPDATE|FROM|JOIN)\s+"?MATCH"?\b', r"\1 `MATCH`", mysql_sql, flags=re.IGNORECASE)
    return mysql_sql

@app.post("/api/sync-sql")
def sync_sql(req: SqlExecRequest):
    conn = get_db()
    cursor = conn.cursor()
    try:
        mysql_query = convert_sqlite_to_mysql(req.sql)
        params = tuple(req.params) if req.params else ()
        cursor.execute(mysql_query, params)
        conn.commit()
        return {
            "ok": True,
            "affected_rows": cursor.rowcount,
            "last_insert_id": cursor.lastrowid
        }
    except mysql.connector.Error as err:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(err))
    finally:
        cursor.close()
        conn.close()