import os

from celery import Celery
from celery.schedules import crontab


REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

celery_app = Celery(
    "gigshield",
    broker=REDIS_URL,
    backend=REDIS_URL,
)

# Poll every 5 minutes in production. For demos you can override with env.
poll_minutes = int(os.getenv("TRIGGER_POLL_MINUTES", "5"))

celery_app.conf.beat_schedule = {
    "trigger-poller-every-5-min": {
        "task": "app.tasks.trigger_poller.poll_triggers",
        "schedule": crontab(minute=f"*/{poll_minutes}"),
    }
}

celery_app.conf.timezone = "UTC"

