"""API v1 패키지"""

from fastapi import APIRouter

from features.experience_map.config import get_settings

from .correction import router as correction_router

router = APIRouter(prefix="/v1")
router.include_router(correction_router)

# 경험맵 기능 flag가 꺼져 있으면 라우트 자체를 등록하지 않아 404가 된다.
experience_map_settings = get_settings()

if experience_map_settings.enabled:
    from .experience_map import router as experience_map_router

    router.include_router(experience_map_router)

if experience_map_settings.demo_mode:
    from .experience_map_demo import router as experience_map_demo_router

    router.include_router(experience_map_demo_router)

__all__ = ["router"]
