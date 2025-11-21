# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git

# Copy go mod files
COPY go.mod go.sum* ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./main.go

# Runtime stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates tzdata wget

WORKDIR /root/

# Create GeoIP directory
RUN mkdir -p /usr/share/GeoIP

# Copy the binary from builder
COPY --from=builder /app/main .

# Note: GeoLite2 databases should be mounted as volumes or downloaded
# The default paths are:
# - /usr/share/GeoIP/GeoLite2-City.mmdb
# - /usr/share/GeoIP/GeoLite2-ASN.mmdb (optional)
# - /usr/share/GeoIP/GeoLite2-ISP.mmdb (optional)

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Run the application
CMD ["./main"]

