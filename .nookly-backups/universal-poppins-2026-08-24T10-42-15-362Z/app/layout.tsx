import { Poppins } from "next/font/google";

import "./globals.css";

import { AuthProvider } from "@/contexts/auth-context";
import { WebPushProvider } from "@/contexts/web-push-context";
import { MessageAlertProvider } from "@/contexts/message-alert-context";
import { SosAlertProvider } from "@/contexts/sos-alert-context";
import { NotificationToast } from "@/components/NotificationToast";
import { ThemeProvider } from "@/contexts/theme-context";
import { OfflineBanner } from "@/components/offline-banner";

import { Toaster } from "react-hot-toast";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-nookly",
  display: "swap",
});

export const metadata = {
  title: "Nookly - Property Management",
  description: "Manage your properties efficiently",
  manifest: "/manifest.json",

  icons: {
    icon: "/images/icon.png",
    shortcut: "/images/icon.png",
    apple: "/images/icon.png",
  },
};

export const viewport = {
  themeColor: "#081a33",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: true,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <body
        className={`${poppins.className} ${poppins.variable} overflow-x-hidden`}
      >
        <ThemeProvider>
          <AuthProvider>
            <WebPushProvider>
              <SosAlertProvider>
                <MessageAlertProvider>
                  <OfflineBanner />

                  <div className="min-h-screen w-full max-w-full overflow-x-hidden">
                    {children}

                    <NotificationToast />
                  </div>

                  <Toaster
                    position="top-right"
                    toastOptions={{
                      duration: 3000,

                      style: {
                        background: "#363636",
                        color: "#fff",
                      },

                      success: {
                        duration: 3000,

                        iconTheme: {
                          primary: "#22c55e",
                          secondary: "#fff",
                        },
                      },

                      error: {
                        duration: 4000,

                        iconTheme: {
                          primary: "#ef4444",
                          secondary: "#fff",
                        },
                      },
                    }}
                  />
                </MessageAlertProvider>
              </SosAlertProvider>
            </WebPushProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}