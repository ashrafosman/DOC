import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "vercel_src"))

from mn_doc_poc.backend.app import app
from mangum import Mangum

handler = Mangum(app, lifespan="auto")
