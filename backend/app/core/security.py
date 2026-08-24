"""Password hashing and session-token helpers.

Deliberately dependency-free: PBKDF2-HMAC-SHA256 from the standard library.
Passwords are never stored or logged in plain text.
"""

import hashlib
import hmac
import secrets

PBKDF2_ITERATIONS = 260_000
_SALT_BYTES = 16
_HASH_PREFIX = "pbkdf2_sha256"


def hash_password(password: str) -> str:
    salt = secrets.token_hex(_SALT_BYTES)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), PBKDF2_ITERATIONS
    )
    return f"{_HASH_PREFIX}${PBKDF2_ITERATIONS}${salt}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        prefix, iterations_str, salt, expected_hex = stored.split("$", 3)
        if prefix != _HASH_PREFIX:
            return False
        iterations = int(iterations_str)
    except ValueError:
        return False
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations
    )
    return hmac.compare_digest(digest.hex(), expected_hex)


def generate_session_token() -> str:
    return secrets.token_urlsafe(48)
