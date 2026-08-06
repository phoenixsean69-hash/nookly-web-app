NOOKLY SOS BUZZER UNTIL SEEN

PURPOSE
Play public/buzzer.mp3 continuously while the signed-in university has one or
more unseen student SOS notifications.

INSTALL
1. Confirm this file exists:
   C:\Users\nooklyweb\Desktop\nookly-web\public\buzzer.mp3
2. Extract this ZIP inside Downloads.
3. Open nookly-sos-buzzer-until-seen.
4. Double-click INSTALL.cmd.
5. Stop npm run dev with Ctrl+C.
6. Run npm run dev again.
7. Test with an unseen real SOS.

BEHAVIOUR
- The buzzer starts for unseen SOS alerts loaded from Appwrite.
- The buzzer starts immediately for a new Appwrite Realtime SOS.
- It loops across every Nookly Web dashboard page.
- Closing the red dashboard alert does not silence it.
- Opening the map does not silence it.
- Opening the SOS page does not silence it.
- Marking one SOS seen will not stop it when another unseen SOS remains.
- Marking the final unseen SOS seen stops and rewinds the buzzer.
- Logging out or closing the provider stops the buzzer.

BROWSER AUTOPLAY
Some browsers block sound until the user interacts with the page. When that
happens, Nookly displays an "Enable SOS buzzer" button. The next click, keypress,
or touch also retries playback automatically.

The installer verifies public/buzzer.mp3, backs up the SOS provider, and never
deletes .next.
