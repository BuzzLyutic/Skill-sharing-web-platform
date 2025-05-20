# backend/Dockerfile
# Stage 1: Build the Go application
FROM golang:1.24.0-alpine AS builder

WORKDIR /app

# Copy go.mod and go.sum first to leverage Docker cache
COPY go.mod go.sum ./
RUN echo "--- Running go mod download ---" && \
    go mod download && \
    echo "--- go mod download completed ---"

# Copy the rest of the application source code
COPY . .
RUN echo "--- Contents of /app before build ---" && \
    ls -Rla /app # List all files recursively to see what's copied

# Build the application
# CGO_ENABLED=0 for a static binary, good for Alpine
# -ldflags="-w -s" to strip debug symbols and reduce binary size
RUN set -e; \
    echo "--- Attempting to build Go application ---"; \
    CGO_ENABLED=0 GOOS=linux go build -v -ldflags="-w -s" -o /app/main ./main.go; \
    echo "--- Go build command finished. Verifying /app/main ---"; \
    if [ ! -f /app/main ]; then \
        echo "!!! BUILD ERROR: /app/main was NOT created !!!"; \
        exit 1; \
    fi; \
    echo "--- /app/main found in builder stage. Size: ---"; \
    ls -lh /app/main

# Stage 2: Create the final small image
FROM alpine:latest

WORKDIR /app

# Copy the built binary from the builder stage
COPY --from=builder /app/main /app/main
# Add a check here too, just in case the COPY fails silently (unlikely)
RUN set -e; \
    if [ ! -f /app/main ]; then \
        echo "!!! FINAL STAGE ERROR: /app/main NOT FOUND after COPY !!!"; \
        exit 1; \
    fi; \
    echo "--- /app/main found in final stage. Size: ---"; \
    ls -lh /app/main
# Copy .env file (Render will use environment variables directly)
COPY .env /app/.env

# Copy database migration files if your Go app runs them (otherwise, they run separately)
COPY db/migrations /app/db/migrations

# Expose the port the Gin server will run on
EXPOSE 8080 

# Command to run the executable
ENTRYPOINT ["/app/main"]