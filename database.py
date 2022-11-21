from typing import Optional, List

from sqlmodel import Field, Session, SQLModel, create_engine, select


class Todo(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    text: str = Field(max_length=25)
    is_completed: bool = Field(default=False)
    is_deleted: bool = Field(default=False)
    order: int

    def __hash__(self):
        return self.id if self.id else -1


sqlite_file_name = "database.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

connect_args = {"check_same_thread": False}
# engine = create_engine(sqlite_url, echo=False, connect_args=connect_args)
engine = create_engine(sqlite_url, echo=True, connect_args=connect_args)


# Dependency
def get_db():
    db = Session(engine)
    try:
        yield db
    finally:
        db.close()


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_todos(session: Session) -> List[Todo]:
    statement = select(Todo).where(Todo.is_deleted == False).order_by(Todo.order)
    return session.exec(statement).all()


def create_todos(todos: List[Todo], session: Session):
    for todo in todos:
        session.add(todo)
    session.commit()


def update_todos(todos: List[Todo], session: Session):
    for todo in todos:
        statement = select(Todo).where(Todo.id == todo.id)
        results = session.exec(statement)
        old_todo = results.one()

        old_todo.text = todo.text
        old_todo.is_completed = todo.is_completed
        old_todo.order = todo.order

        session.add(old_todo)
    session.commit()


def mark_as_completed(todos: List[Todo], session: Session):
    for todo in todos:
        statement = select(Todo).where(Todo.id == todo.id)
        results = session.exec(statement)

        old_todo = results.one()
        old_todo.is_completed = True

        session.add(old_todo)
    session.commit()


def mark_as_deleted(todos: List[Todo], session: Session):
    for todo in todos:
        statement = select(Todo).where(Todo.id == todo.id)
        results = session.exec(statement)

        old_todo = results.one()
        old_todo.is_deleted = True

        session.add(old_todo)
    session.commit()
