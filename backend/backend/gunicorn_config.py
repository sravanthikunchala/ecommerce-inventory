import multiprocessing

# Gunicorn configuration for pavaman_backend
bind = "127.0.0.1:8000"
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
worker_connections = 1000
timeout = 30
keepalive = 2

# Logging
accesslog = "/home/ubuntu/pavaman_backend/logs/gunicorn_access.log"
errorlog = "/home/ubuntu/pavaman_backend/logs/gunicorn_error.log"
loglevel = "info"

# Process naming
proc_name = "pavaman_backend"

# Server mechanics
daemon = False
pidfile = "/home/ubuntu/pavaman_backend/gunicorn.pid"

