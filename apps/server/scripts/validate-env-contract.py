from pathlib import Path


BASE_REQUIRED_KEYS = {
    "APP_PROFILE",
    "DB_HOST",
    "DB_PORT",
    "DB_USERNAME",
    "DB_PASSWORD",
    "DB_SCHEMA",
    "JWT_SECRET_TOKEN",
    "JWT_REFRESH_TOKEN",
    "KAKAO_CLIENT_ID",
    "KAKAO_CLIENT_SECRET",
    "KAKAO_CALLBACK_URL",
    "CLIENT_REDIRECT_URI",
    "CORS_ORIGINS",
    "AI_BASE_URL",
}



def parse_env(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}

    env: dict[str, str] = {}
    for line in path.read_text().splitlines():
        item = line.strip()
        if not item or item.startswith("#") or "=" not in item:
            continue

        key, value = item.split("=", 1)
        key = key.strip()
        if key:
            env[key] = value.strip()

    return env


def validate_file(rel: str, env: dict[str, str]) -> list[str]:
    errors: list[str] = []

    missing = sorted(BASE_REQUIRED_KEYS - set(env.keys()))
    for key in missing:
        errors.append(f"missing required key: {key}")

    profile = env.get("APP_PROFILE", "").strip()
    expected_profile = {".env": "local", ".env.dev": "dev", ".env.prod": "prod"}.get(
        rel
    )
    if expected_profile and profile != expected_profile:
        errors.append(
            f"APP_PROFILE mismatch: expected '{expected_profile}' for {rel}, got '{profile or '(empty)'}'"
        )

    if rel in {".env.dev", ".env.prod"}:
        supabase_db_url = env.get("SUPABASE_DB_URL", "").strip()
        if not supabase_db_url:
            errors.append("SUPABASE_DB_URL is required for dev/prod profile routing")

    return errors


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    files = [".env", ".env.dev", ".env.prod", ".env.example"]
    failed = False

    for rel in files:
        path = root / rel
        env = parse_env(path)
        errors = validate_file(rel, env)
        if errors:
            failed = True
            print(f"[FAIL] {rel}: {len(errors)} issue(s)")
            for err in errors:
                print(f"  - {err}")
        else:
            print(f"[OK] {rel}: contract valid")

    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
