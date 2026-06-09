# Use official lightweight Python image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend app source code
COPY . .

# Copy the dataset from root's public folder to public inside /app (for fallback loading)
# Note: we will make sure docker-compose handles context mapping or we copy the dataset in build steps.
# To be robust, let's create a public directory inside backend and put the dataset there.
RUN mkdir -p public
COPY public/agriculture_dataset.csv ./public/ || true

# Expose port
EXPOSE 8000

# Start server using uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
