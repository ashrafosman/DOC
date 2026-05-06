import sys
import traceback

try:
    from mn_doc_poc.backend.app import app
    from mangum import Mangum
    handler = Mangum(app, lifespan="auto")
except Exception as _e:
    _tb = traceback.format_exc()
    _sp = sys.path[:]
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse
    from mangum import Mangum  # noqa: F811

    _err_app = FastAPI()

    @_err_app.get("/{path:path}")
    async def _debug(path: str):
        return JSONResponse({"error": str(_e), "type": type(_e).__name__, "traceback": _tb, "sys_path": _sp}, status_code=500)

    handler = Mangum(_err_app)
