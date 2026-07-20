from unittest.mock import patch

from app.core.security import get_current_user
from app.main import app
from app.services import areas as area_service


def test_unhandled_exception_still_carries_cors_headers(client):
    """A crash deep in a route (e.g. a DB error) must not bypass CORSMiddleware —
    otherwise the browser reports a misleading 'blocked by CORS policy' error
    instead of the real failure."""
    app.dependency_overrides[get_current_user] = lambda: "user-1"
    try:
        with patch.object(area_service, "get_areas", side_effect=RuntimeError("boom")):
            response = client.get("/areas", headers={"Origin": "https://example.com"})
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 500
    assert response.headers.get("access-control-allow-origin") == "*"
