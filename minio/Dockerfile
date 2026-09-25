# Build MinIO from the last open-source release source.
# Community edition is archived and the official images were removed from
# Docker Hub and Quay, so we compile the final release tag ourselves.

FROM golang:1.24-alpine AS build

ARG RELEASE=RELEASE.2025-10-15T17-29-55Z

RUN apk add --no-cache ca-certificates wget
WORKDIR /src
RUN wget -qO minio.tgz "https://github.com/minio/minio/archive/refs/tags/${RELEASE}.tar.gz" \
  && mkdir minio && tar -xzf minio.tgz -C minio --strip-components=1

WORKDIR /src/minio
RUN CGO_ENABLED=0 go build -tags kqueue -trimpath -o /out/minio .

# ------------------------------------------------------------
FROM alpine:3.21

RUN apk add --no-cache ca-certificates tzdata

COPY --from=build /out/minio /usr/local/bin/minio

ENV MINIO_UPDATE=off

ENTRYPOINT ["minio"]
CMD ["server", "/data", "--console-address", ":9001"]