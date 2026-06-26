# Village War — zero-dependency Python backend + static game.
FROM python:3.12-slim

WORKDIR /app
COPY . /app

# Persist the SQLite DB outside the image
VOLUME ["/data"]
ENV VW_ROOT=/app
ENV PORT=8080
# store the DB on the mounted volume
ENV VW_DB=/data/villagewar.db

EXPOSE 8080
# stdlib only — nothing to pip install
CMD ["python3", "server.py"]
