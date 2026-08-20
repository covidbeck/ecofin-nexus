"""Auth stub for the demo. Simulates a protected profile route for the jury.

Not real JWT verification — this is a placeholder to be swapped for a proper
signed-token flow post-hackathon. See SPECIFICATION.md Golden Path.
"""

from fastapi import Header, HTTPException

DEMO_TOKEN = "demo-jwt-token"  # noqa: S105 — intentional mock token for the demo


async def verify_token(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = authorization.removeprefix("Bearer ").strip()
    if token != DEMO_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return {"sub": "demo-bakery-owner", "role": "sme_owner"}
