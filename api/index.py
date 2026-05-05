from mn_doc_poc.backend.app import app
from mangum import Mangum

handler = Mangum(app, lifespan="auto")
