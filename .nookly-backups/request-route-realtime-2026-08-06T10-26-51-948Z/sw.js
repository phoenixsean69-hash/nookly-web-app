const DEFAULT_ICON = "/images/icon.png";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function parsePushPayload(event) {
  if (!event.data) return {};

  try {
    return event.data.json();
  } catch {
    try {
      return {
        body: event.data.text(),
      };
    } catch {
      return {};
    }
  }
}

function notificationData(payload) {
  const nested =
    payload &&
    typeof payload.data === "object" &&
    payload.data !== null
      ? payload.data
      : {};

  return {
    ...nested,
    type:
      nested.type ||
      payload.type ||
      "notification",
  };
}

function destinationFor(data) {
  if (
    data.type === "request"
  ) {
    const requestId =
      String(
        data.requestId ||
        data.request ||
        "",
      ).trim();

    if (requestId) {
      return `/dashboard/requests/${encodeURIComponent(
        requestId,
      )}`;
    }

    const legacyUrl =
      typeof data.url === "string"
        ? data.url.trim()
        : "";

    const legacyMatch =
      legacyUrl.match(
        /[?&](?:request|requestId)=([^&#]+)/,
      );

    if (legacyMatch?.[1]) {
      try {
        return `/dashboard/requests/${encodeURIComponent(
          decodeURIComponent(
            legacyMatch[1],
          ),
        )}`;
      } catch {
        return `/dashboard/requests/${encodeURIComponent(
          legacyMatch[1],
        )}`;
      }
    }
  }

  if (
    typeof data.url === "string" &&
    data.url.trim()
  ) {
    return data.url;
  }

  if (data.type === "student_sos") {
    const notificationId =
      data.notificationId ||
      data.alertId ||
      "";

    return notificationId
      ? `/dashboard/sos?alert=${encodeURIComponent(
          notificationId,
        )}&map=1`
      : "/dashboard/sos?map=1";
  }

  if (
    typeof data.screen === "string" &&
    data.screen.startsWith("/")
  ) {
    return data.screen;
  }

  return "/dashboard";
}

self.addEventListener("push", (event) => {
  const payload = parsePushPayload(event);
  const data = notificationData(payload);
  const isSos = data.type === "student_sos";

  const title =
    payload.title ||
    (isSos
      ? "Emergency student SOS"
      : "Nookly notification");

  const body =
    payload.body ||
    payload.message ||
    (isSos
      ? "A student emergency was assigned to your institution."
      : "You have a new Nookly notification.");

  const url = destinationFor(data);

  event.waitUntil(
    self.clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then(async (clients) => {
        if (isSos) {
          for (const client of clients) {
            client.postMessage({
              type: "student_sos",
              action: "play-sos-buzzer",
              alertId:
                data.alertId || "",
              notificationId:
                data.notificationId || "",
              url,
            });
          }
        }

        // When a Nookly Web window is active, buzzer.mp3 supplies the
        // notification sound. A fully closed browser may use its normal
        // operating-system notification sound because pages cannot play audio.
        const useCustomBuzzer =
          isSos && clients.length > 0;

        return self.registration.showNotification(title, {
          body,
          icon: payload.icon || DEFAULT_ICON,
          badge: payload.badge || DEFAULT_ICON,
          tag:
            payload.tag ||
            (isSos
              ? `student-sos-${
                  data.alertId ||
                  data.notificationId ||
                  Date.now()
                }`
              : `nookly-${Date.now()}`),
          requireInteraction:
            payload.requireInteraction ??
            isSos,
          silent:
            useCustomBuzzer
              ? true
              : payload.silent ?? false,
          data: {
            ...data,
            url,
          },
          actions: isSos
            ? [
                {
                  action: "open-sos",
                  title: "Open SOS",
                },
                {
                  action: "dismiss",
                  title: "Dismiss",
                },
              ]
            : [
                {
                  action: "open",
                  title: "Open Nookly",
                },
                {
                  action: "dismiss",
                  title: "Dismiss",
                },
              ],
        });
      }),
  );
});

self.addEventListener(
  "notificationclick",
  (event) => {
    event.notification.close();

    if (event.action === "dismiss") {
      return;
    }

    const rawUrl =
      event.notification.data?.url ||
      "/dashboard/sos?map=1";

    const absoluteUrl = new URL(
      rawUrl,
      self.location.origin,
    ).href;

    const relativeUrl =
      absoluteUrl.startsWith(self.location.origin)
        ? absoluteUrl.slice(self.location.origin.length) ||
          "/dashboard/sos?map=1"
        : "/dashboard/sos?map=1";

    event.waitUntil(
      self.clients
        .matchAll({
          type: "window",
          includeUncontrolled: true,
        })
        .then(async (windowClients) => {
          const nooklyClient =
            windowClients.find((client) =>
              client.url.startsWith(
                self.location.origin,
              ),
            );

          if (nooklyClient) {
            // Bring the existing Nookly tab to the front first.
            if ("focus" in nooklyClient) {
              await nooklyClient.focus();
            }

            // Tell the mounted Nookly app to select the exact SOS and open its map.
            nooklyClient.postMessage({
              type: "student_sos",
              action: "open-sos-map",
              url: relativeUrl,
              alertId:
                event.notification.data?.alertId ||
                "",
              notificationId:
                event.notification.data?.notificationId ||
                "",
            });

            // Fallback when the React listener has not mounted yet.
            if ("navigate" in nooklyClient) {
              try {
                await nooklyClient.navigate(
                  absoluteUrl,
                );
              } catch (caught) {
                console.warn(
                  "Unable to navigate the focused Nookly client:",
                  caught,
                );
              }
            }

            return;
          }

          // No Nookly tab exists, so open one directly at the exact SOS map.
          return self.clients.openWindow(
            absoluteUrl,
          );
        }),
    );
  },
);
