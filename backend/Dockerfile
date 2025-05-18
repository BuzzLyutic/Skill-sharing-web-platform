# backend/Dockerfile
# Stage 1: Build the Go application
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy go.mod and go.sum first to leverage Docker cache
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the application source code
COPY . .

# Build the application
# CGO_ENABLED=0 for a static binary, good for Alpine
# -ldflags="-w -s" to strip debug symbols and reduce binary size
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/main ./main.go

# Stage 2: Create the final small image
FROM alpine:latest

WORKDIR /app

# Copy the built binary from the builder stage
COPY --from=builder /app/main /app/main

# Copy .env file (Render will use environment variables directly)
# COPY .env .env # For local Docker, not for Render deployment

# Copy database migration files if your Go app runs them (otherwise, they run separately)
COPY db/migrations /app/db/migrations

# Expose the port the Gin server will run on
EXPOSE 8080 

# Command to run the executable
ENTRYPOINT ["/app/main"]