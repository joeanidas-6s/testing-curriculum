type FirebaseWebConfig = {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
};

const env =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env ??
  {};

const firebaseConfig: FirebaseWebConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

function getMissingFirebaseConfigKeys(config: FirebaseWebConfig): string[] {
  const required: Array<keyof FirebaseWebConfig> = [
    "apiKey",
    "authDomain",
    "projectId",
    "messagingSenderId",
    "appId",
  ];
  return required.filter((k) => !config[k]);
}

async function getMessagingInstance() {
  // Avoid crashing the whole app if Firebase isn't configured in a given env.
  const missing = getMissingFirebaseConfigKeys(firebaseConfig);
  if (missing.length > 0) return null;

  if (typeof window === "undefined") return null;

  // Dynamic imports ensure Firebase code isn't evaluated unless needed.
  const { initializeApp, getApp, getApps } = await import("firebase/app");
  const { getMessaging, isSupported } = await import("firebase/messaging");

  const supported = await isSupported().catch(() => false);
  if (!supported) return null;

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return getMessaging(app);
}

export const requestForToken = async (): Promise<string | null> => {
  try {
    const messaging = await getMessagingInstance();
    if (!messaging) return null;

    const vapidKey = env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) return null;

    if (!("serviceWorker" in navigator)) return null;

    const params = new URLSearchParams({
      apiKey: firebaseConfig.apiKey!,
      authDomain: firebaseConfig.authDomain!,
      projectId: firebaseConfig.projectId!,
      storageBucket: firebaseConfig.storageBucket ?? "",
      messagingSenderId: firebaseConfig.messagingSenderId!,
      appId: firebaseConfig.appId!,
    });

    const registration = await navigator.serviceWorker.register(
      `/firebase-messaging-sw.js?${params.toString()}`,
    );

    const { getToken } = await import("firebase/messaging");
    const currentToken = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    return currentToken || null;
  } catch (err) {
    // Silent fail (missing config, denied permission, unsupported browser, etc.)
    console.warn("FCM token retrieval failed:", err);
    return null;
  }
};

export const onMessageListener = async (): Promise<unknown | null> => {
  const messaging = await getMessagingInstance();
  if (!messaging) return null;

  const { onMessage } = await import("firebase/messaging");
  return await new Promise((resolve) => {
    onMessage(messaging, (payload) => resolve(payload));
  });
};
