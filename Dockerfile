# Build with the Docker Hardened Image dev variant, it has the shell, npm and package manager
FROM dhi.io/node:22-dev AS build

# SteamCMD and the Arma server need a 32-bit runtime, staged in /runtime for the runtime image.
# Debian's 32-bit packages depend on the exact versions of the 64-bit packages, DHI rebuilds those
# with a +dhi version suffix of the same release, so the packages are unpacked without dpkg.
RUN apt-get update \
  && mkdir -p /tmp/debs /runtime/usr/lib \
  && cd /tmp/debs \
  && apt-get download libc6-i386 lib32gcc-s1 lib32stdc++6 lib32z1 tini \
  && for deb in *.deb; do dpkg -x "$deb" /runtime; done \
  && ln -s ../lib32/ld-linux.so.2 /runtime/usr/lib/ld-linux.so.2 \
  && mv /runtime/usr/bin/tini-static /runtime/usr/bin/tini \
  && rm -rf /runtime/usr/share /tmp/debs \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

# steamcmd.sh is a bash script, the runtime image has no shell
RUN cp -a --parents /usr/bin/bash /usr/bin/env /usr/bin/dirname /usr/bin/basename /usr/bin/uname \
  /usr/lib/x86_64-linux-gnu/libtinfo.so.6* /runtime/

# Install node dependencies for the application
WORKDIR /app
COPY package.json package-lock.json /app/
RUN npm ci

# Copy application with Docker config and empty servers config
COPY . /app/
COPY config.docker.js /app/config.js
RUN echo '[]' > /app/servers.json

# Run tests with the example config, used by CI with --target test
FROM build AS test
RUN cp config.js.example config.js && npm test

# Application without development dependencies
FROM build AS release
RUN npm prune --omit=dev

# Runtime with the Docker Hardened Image, without shell and package manager, runs as user node (1000)
FROM dhi.io/node:22

COPY --from=build /runtime/ /

WORKDIR /app
COPY --from=release /app /app
COPY --from=release --chown=1000:1000 /app/servers.json /app/servers.json

# Start application, tini forwards stop signals that node ignores as PID 1
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "app.js"]

# Declare application port
EXPOSE 3000
