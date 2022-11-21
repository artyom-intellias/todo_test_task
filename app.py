from typing import List

from fastapi import FastAPI, Depends, Request, status, staticfiles
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from starlette.templating import Jinja2Templates

from database import create_db_and_tables, Todo, get_db, get_todos, create_todos, update_todos, mark_as_completed, \
    mark_as_deleted

templates = Jinja2Templates(directory="templates")
app = FastAPI()
app.mount("/static", staticfiles.StaticFiles(directory="static"), name="static")


class ResponseTodo(Todo):
    class Config:
        fields = {'is_deleted': {'exclude': True}}


@app.on_event("startup")
def on_startup():
    create_db_and_tables()


@app.get("/")
async def index(req: Request):
    return templates.TemplateResponse("index.html", {"request": req})


@app.get("/todos", response_model=List[ResponseTodo])
async def fetch_todos(db: Session = Depends(get_db)):
    result = get_todos(db)
    return result


@app.post("/todos")
async def save_todos(todos: List[Todo], db: Session = Depends(get_db)):

    todos_ = []
    ui_created_completed = []  # created in UI not in DB yet, and already marked as completed
    for todo in todos:
        if todo.id is None and todo.is_completed:
            ui_created_completed.append(todo)
        else:
            todos_.append(todo)
    todos = todos_

    to_be_updated = [todo for todo in todos if todo.id]
    if to_be_updated:
        update_todos(to_be_updated, db)
    updated_from_db = get_todos(db)

    to_remove = list(set(updated_from_db) - set(to_be_updated))  # difference is what was deleted on UI
    mark_as_deleted(to_remove, db)

    ui_created_not_completed = [todo for todo in todos if todo.id is None and not todo.is_completed]
    if ui_created_not_completed:
        create_todos(ui_created_not_completed, db)

    if ui_created_completed:
        create_todos(ui_created_completed, db)
        mark_as_completed(ui_created_completed, db)

    return RedirectResponse(app.url_path_for(name=fetch_todos.__name__), status_code=status.HTTP_303_SEE_OTHER)
