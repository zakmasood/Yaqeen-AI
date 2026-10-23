from app.core.local_auth import hash_password, issue_token, read_token, verify_password


def test_demo_password_roundtrip():
    stored = hash_password("demo-demo")
    assert verify_password("demo-demo", stored)
    assert not verify_password("other", stored)


def test_local_token_roundtrip():
    token = issue_token("user-1", "secret")
    assert read_token(token, "secret") == "user-1"
