FROM python:3.13-slim AS base

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

WORKDIR /app

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
