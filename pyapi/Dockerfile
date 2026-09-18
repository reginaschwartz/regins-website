FROM python:3.12-slim

WORKDIR /app

# CPU wheels only: the GPU build of torch adds several GB to the image.
RUN pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu \
    "fastapi>=0.115" "uvicorn[standard]>=0.32" "pydantic>=2.9" "python-multipart>=0.0.12" \
    "torch>=2.4" "transformers>=4.45" "accelerate>=1.0"

COPY app/ ./app/

ENV PYTHONUNBUFFERED=1
ENV COVER_LETTER_ARTIFACT_ROOT=/data/cover-letters
ENV HF_HOME=/data/huggingface
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD python -c "import urllib.request;urllib.request.urlopen('http://127.0.0.1:8000/pyapi/healthz')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
