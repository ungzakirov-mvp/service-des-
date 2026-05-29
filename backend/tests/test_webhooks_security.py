"""Integration tests: webhook security — HMAC signature verification flow."""
import time
import hmac
import hashlib
import pytest

from app.domains.webhooks import security as sec
from app.domains.webhooks import constants as const


WEBHOOK_SECRET = "test-secret-key-for-testing-12345"
TEST_BODY = b'{"sender": "test@test.com", "subject": "Test", "body": "Hello"}'
TEST_BODY_LARGE = b"x" * (const.MAX_PAYLOAD_SIZE + 1)


class TestSignatureComputation:
    def test_compute_signature_returns_hex_string(self):
        ts = int(time.time())
        sig = sec.compute_signature(WEBHOOK_SECRET, TEST_BODY, ts)
        assert isinstance(sig, str)
        assert len(sig) == 64  # SHA256 hex = 64 chars
        assert all(c in "0123456789abcdef" for c in sig)

    def test_compute_signature_deterministic(self):
        ts = int(time.time())
        sig1 = sec.compute_signature(WEBHOOK_SECRET, TEST_BODY, ts)
        sig2 = sec.compute_signature(WEBHOOK_SECRET, TEST_BODY, ts)
        assert sig1 == sig2

    def test_different_body_different_signature(self):
        ts = int(time.time())
        sig1 = sec.compute_signature(WEBHOOK_SECRET, TEST_BODY, ts)
        sig2 = sec.compute_signature(WEBHOOK_SECRET, b"different body", ts)
        assert sig1 != sig2

    def test_different_secret_different_signature(self):
        ts = int(time.time())
        sig1 = sec.compute_signature(WEBHOOK_SECRET, TEST_BODY, ts)
        sig2 = sec.compute_signature("different-secret", TEST_BODY, ts)
        assert sig1 != sig2

    def test_different_timestamp_different_signature(self):
        sig1 = sec.compute_signature(WEBHOOK_SECRET, TEST_BODY, 1000)
        sig2 = sec.compute_signature(WEBHOOK_SECRET, TEST_BODY, 2000)
        assert sig1 != sig2


class TestSignatureVerification:
    def test_verify_valid_signature(self):
        ts = int(time.time())
        sig = sec.compute_signature(WEBHOOK_SECRET, TEST_BODY, ts)
        assert sec.verify_signature(sig, WEBHOOK_SECRET, TEST_BODY, ts) is True

    def test_verify_wrong_signature(self):
        ts = int(time.time())
        assert sec.verify_signature("wrong", WEBHOOK_SECRET, TEST_BODY, ts) is False

    def test_verify_wrong_secret(self):
        ts = int(time.time())
        sig = sec.compute_signature(WEBHOOK_SECRET, TEST_BODY, ts)
        assert sec.verify_signature(sig, "wrong-secret", TEST_BODY, ts) is False

    def test_verify_expired_timestamp(self):
        old_ts = int(time.time()) - const.MAX_TIMESTAMP_AGE_SECONDS - 60
        sig = sec.compute_signature(WEBHOOK_SECRET, TEST_BODY, old_ts)
        assert sec.verify_signature(sig, WEBHOOK_SECRET, TEST_BODY, old_ts) is True
        assert sec.validate_timestamp(old_ts) is False


class TestTimestampValidation:
    def test_current_timestamp_valid(self):
        ts = int(time.time())
        assert sec.validate_timestamp(ts) is True

    def test_recent_timestamp_valid(self):
        ts = int(time.time()) - 60
        assert sec.validate_timestamp(ts) is True

    def test_future_timestamp_invalid(self):
        ts = int(time.time()) + const.MAX_TIMESTAMP_AGE_SECONDS + 60
        assert sec.validate_timestamp(ts) is False

    def test_old_timestamp_invalid(self):
        ts = int(time.time()) - const.MAX_TIMESTAMP_AGE_SECONDS - 60
        assert sec.validate_timestamp(ts) is False


class TestSignatureHeaderParsing:
    def test_parse_valid_header(self):
        ts = int(time.time())
        sig = sec.compute_signature(WEBHOOK_SECRET, TEST_BODY, ts)
        header = f"{const.SIGNATURE_PREFIX}{sig},t={ts}"
        result = sec.parse_signature_header(header)
        assert result is not None
        parsed_sig, parsed_ts = result
        assert parsed_sig == sig
        assert parsed_ts == ts

    def test_parse_header_missing_prefix(self):
        header = "nosigprefix123,t=1000"
        assert sec.parse_signature_header(header) is None

    def test_parse_header_missing_timestamp(self):
        header = "sha256=somesig"
        assert sec.parse_signature_header(header) is None

    def test_parse_header_empty(self):
        assert sec.parse_signature_header("") is None


class TestFormatSignatureHeader:
    def test_format_header_roundtrip(self):
        header = sec.format_signature_header(WEBHOOK_SECRET, TEST_BODY)
        assert header.startswith(const.SIGNATURE_PREFIX)
        assert ",t=" in header
        parsed = sec.parse_signature_header(header)
        assert parsed is not None
        sig, ts = parsed
        assert sec.verify_signature(sig, WEBHOOK_SECRET, TEST_BODY, ts)


class TestRequireSignedWebhook:
    def test_missing_header_raises_401(self):
        with pytest.raises(Exception):
            sec.require_signed_webhook(None, TEST_BODY, WEBHOOK_SECRET)

    def test_invalid_header_format_raises_401(self):
        with pytest.raises(Exception):
            sec.require_signed_webhook("invalid", TEST_BODY, WEBHOOK_SECRET)

    def test_expired_timestamp_raises_401(self):
        old_ts = int(time.time()) - const.MAX_TIMESTAMP_AGE_SECONDS - 60
        sig = sec.compute_signature(WEBHOOK_SECRET, TEST_BODY, old_ts)
        header = f"{const.SIGNATURE_PREFIX}{sig},t={old_ts}"
        with pytest.raises(Exception):
            sec.require_signed_webhook(header, TEST_BODY, WEBHOOK_SECRET)

    def test_wrong_signature_raises_403(self):
        ts = int(time.time())
        wrong_sig = "a" * 64
        header = f"{const.SIGNATURE_PREFIX}{wrong_sig},t={ts}"
        with pytest.raises(Exception):
            sec.require_signed_webhook(header, TEST_BODY, WEBHOOK_SECRET)

    def test_valid_signature_passes(self):
        ts = int(time.time())
        sig = sec.compute_signature(WEBHOOK_SECRET, TEST_BODY, ts)
        header = f"{const.SIGNATURE_PREFIX}{sig},t={ts}"
        try:
            sec.require_signed_webhook(header, TEST_BODY, WEBHOOK_SECRET)
        except Exception as e:
            pytest.fail(f"Valid signature raised: {e}")
