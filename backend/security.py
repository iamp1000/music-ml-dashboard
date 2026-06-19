import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import secrets
import jwt
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

load_dotenv()

# JWT Config
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "super-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def verify_access_token(token: str) -> dict | None:
    try:
        decoded_data = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return decoded_data
    except jwt.PyJWTError:
        return None

class TokenEncryptor:
    """
    AES-256-GCM Encryption for Spotify OAuth Tokens.
    """
    def __init__(self):
        # Key must be 32 bytes (256 bits)
        key_hex = os.getenv("AES_GCM_KEY", "01234567890123456789012345678901")
        # For demo purposes, we encode the 32 char string to bytes. 
        # In production, this should be a proper 32-byte cryptographically secure key.
        self.key = key_hex.encode('utf-8')[:32].ljust(32, b'\0')
        self.aesgcm = AESGCM(self.key)

    def encrypt(self, plaintext: str) -> tuple[str, str]:
        """
        Encrypts a string and returns the hex encoded ciphertext and nonce.
        """
        nonce = secrets.token_bytes(12) # 96-bit nonce required for GCM
        ciphertext = self.aesgcm.encrypt(nonce, plaintext.encode('utf-8'), None)
        return ciphertext.hex(), nonce.hex()

    def decrypt(self, ciphertext_hex: str, nonce_hex: str) -> str:
        """
        Decrypts a hex-encoded ciphertext and nonce back to string.
        """
        ciphertext = bytes.fromhex(ciphertext_hex)
        nonce = bytes.fromhex(nonce_hex)
        plaintext = self.aesgcm.decrypt(nonce, ciphertext, None)
        return plaintext.decode('utf-8')

# Singleton instance
encryptor = TokenEncryptor()

