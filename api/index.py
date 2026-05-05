import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from mn_doc_poc.backend.app import app as handler  # noqa: F401 — Vercel uses 'handler'
