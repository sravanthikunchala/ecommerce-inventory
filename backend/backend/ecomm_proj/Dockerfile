# Use Python 3.12.3 slim as base image
FROM python:3.12.3-slim as builder

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Set work directory
WORKDIR /pavaman_proj

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libcairo2-dev \
    pkg-config \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip wheel --no-cache-dir --no-deps --wheel-dir /wheels -r requirements.txt

# Final stage
FROM python:3.12.3-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/home/appuser/.local/bin:$PATH"

# Create non-root user
RUN useradd -m appuser

# Set work directory
WORKDIR /pavaman_proj

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*
# Copy wheels from builder
COPY --from=builder /wheels /wheels
COPY --from=builder /pavaman_proj/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache /wheels/*

# Copy project files
COPY . .

# Copy .env file if it exists
COPY .env* ./

# Change ownership of the project files
RUN chown -R appuser:appuser /pavaman_proj

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8001

# Run gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:8001", "pavaman_proj.wsgi:application"]
