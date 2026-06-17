# Market Intelligence — static frontend served by nginx.
# No build step: the site is vanilla HTML/CSS/JS.
FROM nginx:1.27-alpine

LABEL org.opencontainers.image.title="market-intelligence" \
      org.opencontainers.image.description="Market Intelligence research portal (static frontend)" \
      org.opencontainers.image.source="https://github.com/judy-0509/market-intelligence"

# Custom config: listens on 8080, logs to stdout/stderr, non-root friendly.
COPY nginx.conf /etc/nginx/nginx.conf

# Static assets.
COPY index.html styles.css app.js /usr/share/nginx/html/

# Prepare writable dirs and hand ownership to the unprivileged nginx user so the
# container can run with USER nginx (uid 101) and even a read-only root fs + /tmp.
RUN mkdir -p /tmp/client_temp /tmp/proxy_temp /tmp/fastcgi_temp /tmp/uwsgi_temp /tmp/scgi_temp \
    && chown -R nginx:nginx /tmp /usr/share/nginx/html

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
