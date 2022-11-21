import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine

from app import app, get_db
from database import Todo

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, echo=True, connect_args={"check_same_thread": False}
)


def override_get_db():
    db = Session(engine)
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def test_session():
    yield from override_get_db()


@pytest.fixture()
def test_db():
    SQLModel.metadata.create_all(engine)
    yield
    SQLModel.metadata.drop_all(engine)


@pytest.fixture()
def todos(test_db, test_session):
    todo_1 = Todo(text='test', order=1)
    todo_2 = Todo(text='test', order=2)
    todo_3 = Todo(text='test', order=3)
    test_session.add(todo_1)
    test_session.add(todo_2)
    test_session.add(todo_3)
    test_session.commit()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def test_save_todos(test_db, todos):
    json_data = [{'id': None, 'text': 'qwe', 'is_completed': False, 'order': 1},
                 {'id': 1, 'text': 'asd', 'is_completed': True, 'order': 2}]

    response = client.post("/todos", json=json_data)
    assert response.status_code == 200, response.text
