# bond-yields-dashboard — static site (government bond yields table).
# No build step: just serve the HTML/CSS/JS with nginx.
FROM nginx:alpine

# Drop the default site and copy ours in. The repo root is the web root.
RUN rm -rf /usr/share/nginx/html/*
COPY . /usr/share/nginx/html/

EXPOSE 80
