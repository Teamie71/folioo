"""테스트 DB 주소 누락 시 개발 DB로 연결하지 않는지 검증한다."""

from pathlib import Path

import pytest


@pytest.fixture
def test_config(request):
    path = Path(__file__).resolve().parents[1] / "conftest.py"
    return request.config.pluginmanager.get_plugin(str(path))


@pytest.mark.parametrize("test_url", [None, "", "   "])
def test_requires_explicit_test_database_url(monkeypatch, test_url, test_config):
    monkeypatch.setenv("DATABASE_URL", "postgresql://localhost/development")
    if test_url is None:
        monkeypatch.delenv("EXPMAP_TEST_DATABASE_URL", raising=False)
    else:
        monkeypatch.setenv("EXPMAP_TEST_DATABASE_URL", test_url)

    with pytest.raises(pytest.UsageError, match="EXPMAP_TEST_DATABASE_URL이 필요합니다"):
        test_config._database_url()


def test_uses_explicit_test_database_url(monkeypatch, test_config):
    monkeypatch.setenv("DATABASE_URL", "postgresql://localhost/development")
    monkeypatch.setenv("EXPMAP_TEST_DATABASE_URL", " postgresql://localhost/test_only ")

    assert test_config._database_url() == "postgresql://localhost/test_only"
