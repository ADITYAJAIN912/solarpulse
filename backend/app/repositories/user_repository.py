"""
app/repositories/user_repository.py — data-access layer for User records.

The Repository pattern separates the "how data is stored" concern from the
"how the API handles a request" concern.  Routes call repository methods and
receive domain objects; they never write raw SQLAlchemy queries.

Tradeoffs:
- Pro: routes become one-liners, trivially testable by mocking the repo.
- Pro: the ORM can be swapped for an async driver later without touching routes.
- Con: adds a thin indirection layer for very simple queries.
  At this scale, the clarity win outweighs the extra file.
"""

from sqlalchemy.orm import Session

from app.models.user import User


class UserRepository:
    """CRUD operations for User, scoped to a SQLAlchemy session."""

    def get_by_id(self, db: Session, user_id: int) -> User | None:
        """Fetch a user by primary key. Returns None if not found."""
        return db.get(User, user_id)

    def get_by_email(self, db: Session, email: str) -> User | None:
        """Fetch a user by email address (case-sensitive). Returns None if not found."""
        return db.query(User).filter(User.email == email).first()

    def email_exists(self, db: Session, email: str) -> bool:
        """Check whether an email is already registered (cheaper than fetching the full row)."""
        return db.query(User.id).filter(User.email == email).first() is not None

    def create(self, db: Session, *, email: str, password_hash: str) -> User:
        """
        Persist a new user and return the refreshed ORM instance.

        The caller is responsible for providing a securely hashed password —
        this method stores it as-is and never hashes.
        """
        user = User(email=email, password_hash=password_hash)
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    def count(self, db: Session) -> int:
        """Return the total number of registered users (used during startup seeding)."""
        return db.query(User).count()


user_repo = UserRepository()
