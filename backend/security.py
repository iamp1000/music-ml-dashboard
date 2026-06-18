import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import secrets
from dotenv import load_dotenv

load_dotenv()

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
        Encrypts a string and returns the base64 encoded ciphertext and nonce.
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
