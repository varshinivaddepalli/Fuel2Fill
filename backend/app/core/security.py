"""JWT token verification for Supabase authentication."""

import jwt
from jwt import PyJWKClient
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.config import get_settings

security = HTTPBearer()
settings = get_settings()

# JWKS client for fetching and caching public keys
_jwks_client: PyJWKClient | None = None


class TokenData:
    def __init__(self, sub: str, email: str | None = None):
        self.sub = sub  # User ID
        self.email = email


def get_jwks_client() -> PyJWKClient:
    """Get or create the JWKS client."""
    global _jwks_client
    if _jwks_client is None:
        jwks_url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
        print(f"[DEBUG] Initializing JWKS client with URL: {jwks_url}")
        _jwks_client = PyJWKClient(jwks_url)
    return _jwks_client


def verify_token(token: str) -> TokenData:
    """Verify Supabase JWT token and extract user data."""
    try:
        # Get the unverified header to check the algorithm
        unverified_header = jwt.get_unverified_header(token)
        alg = unverified_header.get("alg", "HS256")
        kid = unverified_header.get("kid")

        print(f"[DEBUG] Token algorithm: {alg}, kid: {kid}")

        if alg == "HS256":
            # Use the JWT secret for symmetric tokens
            payload = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                options={
                    "verify_aud": False,
                },
            )
        else:
            # Use JWKS for asymmetric tokens (ES256, RS256)
            jwks_client = get_jwks_client()
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            print(f"[DEBUG] Got signing key from JWKS: {signing_key.key_id}")

            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=[alg],
                options={
                    "verify_aud": False,
                },
            )

        user_id = payload.get("sub")
        email = payload.get("email")

        print(f"[DEBUG] Token verified successfully. User: {email}")

        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing user ID",
            )

        return TokenData(sub=user_id, email=email)

    except jwt.ExpiredSignatureError:
        print("[DEBUG] Token has expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except jwt.InvalidTokenError as e:
        print(f"[DEBUG] JWT Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
        )
    except Exception as e:
        print(f"[DEBUG] Verification error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token verification failed: {str(e)}",
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> TokenData:
    """Dependency to get current authenticated user from JWT."""
    return verify_token(credentials.credentials)
