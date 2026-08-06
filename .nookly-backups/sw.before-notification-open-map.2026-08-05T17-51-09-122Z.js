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
        )}`
      : "/dashboard/sos";
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

    const url =
      event.notification.data?.url ||
      "/dashboard";

    const absoluteUrl = new URL(
      url,
      self.location.origin,
    ).href;

    event.waitUntil(
      self.clients
        .matchAll({
          type: "window",
          includeUncontrolled: true,
        })
        .then(async (clients) => {
          for (const client of clients) {
            if (
              "focus" in client &&
              client.url.startsWith(
                self.location.origin,
              )
            ) {
              if ("navigate" in client) {
                await client.navigate(
                  absoluteUrl,
                );
              }

              return client.focus();
            }
          }

          return self.clients.openWindow(
            absoluteUrl,
          );
        }),
    );
  },
);
