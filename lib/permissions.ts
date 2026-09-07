/**
 * Browser permission helpers.
 *
 * One rule runs through all of this: never request a permission on mount.
 * A prompt that appears before the person has asked for anything gets denied,
 * and a denied permission is close to unrecoverable — Chrome starts
 * auto-blocking the origin once enough users dismiss it. So every request in
 * here is called from a click handler, and every one is asked at most once.
 */

const ASKED_NOTIFICATIONS = "bam.perm.notifications.asked";
const ASKED_MICROPHONE = "bam.perm.microphone.asked";

export type PermissionState = "unsupported" | "default" | "granted" | "denied";

const safeGet = (key: string) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode — asking twice is better than crashing */
  }
};

/* ── Notifications ──────────────────────────────────────── */

export function notificationState(): PermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as PermissionState;
}

export function hasAskedNotifications() {
  if (typeof window === "undefined") return true;
  return safeGet(ASKED_NOTIFICATIONS) === "1";
}

/**
 * Call ONLY from a click handler, and only after the person has been told why.
 * Returns the resulting state without throwing.
 */
export async function requestNotifications(): Promise<PermissionState> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  safeSet(ASKED_NOTIFICATIONS, "1");
  try {
    const result = await Notification.requestPermission();
    return result as PermissionState;
  } catch {
    return notificationState();
  }
}

/** True when it is worth showing an "enable notifications" affordance. */
export function shouldOfferNotifications() {
  return notificationState() === "default" && !hasAskedNotifications();
}

/* ── Microphone / camera ────────────────────────────────── */

export function hasAskedMicrophone() {
  if (typeof window === "undefined") return true;
  return safeGet(ASKED_MICROPHONE) === "1";
}

/**
 * Warm the mic permission ahead of time so LiveKit's setMicrophoneEnabled(true)
 * is silent when a call actually rings. Opens the stream, then immediately
 * stops every track — we only want the permission, not the capture.
 *
 * Call from a click handler (the go-live confirmation is the natural one).
 */
export async function warmMicrophone(): Promise<PermissionState> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return "unsupported";
  }
  safeSet(ASKED_MICROPHONE, "1");
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return "granted";
  } catch {
    return "denied";
  }
}

/**
 * Read mic state without prompting. Not supported everywhere (Safari returns
 * nothing useful), so treat "default" as "we don't know" rather than "not asked".
 */
export async function microphoneState(): Promise<PermissionState> {
  if (typeof navigator === "undefined") return "unsupported";
  if (!navigator.permissions?.query) return "default";
  try {
    const result = await navigator.permissions.query({
      name: "microphone" as PermissionName,
    });
    return result.state as PermissionState;
  } catch {
    return "default";
  }
}
