FROM python:3.13-slim AS base

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

WORKDIR /app

# OpenCV is pulled transitively by `ultralytics`. The `opencv-python` wheel
# dynamically links X11/GL runtime shared libraries that the `python:3.13-slim`
# base image does NOT ship — without them `import cv2` (and therefore
# `from ultralytics import YOLO`) crashes the server on boot with
# `ImportError: libxcb.so.1: cannot open shared object file`. Install the
# full runtime set in one cached layer (kept before the dependency copy so it
# is not rebuilt on app-code changes). Deploy-correctness only — no app logic.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libgl1 \
        libglib2.0-0 \
        libsm6 \
        libxext6 \
        libxrender1 \
        libxcb1 \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies
RUN uv sync --frozen --no-install-project

# Copy application code
COPY . .

# Install project
RUN uv sync --frozen

# Activate virtual environment
ENV PATH="/app/.venv/bin:$PATH"

# Create uploads directory
RUN mkdir -p /app/uploads

CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
