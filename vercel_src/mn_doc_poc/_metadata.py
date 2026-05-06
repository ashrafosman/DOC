from pathlib import Path

app_name = "DOC"
app_entrypoint = "mn_doc_poc.backend.app:app"
app_slug = "mn_doc_poc"
api_prefix = "/api"
dist_dir = Path(__file__).parent / "__dist__"