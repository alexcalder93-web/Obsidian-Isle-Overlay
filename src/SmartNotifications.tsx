import { useEffect, useMemo, useRef, useState } from "react";
import type { OverlayTheme, PlayerMe } from "./preload";

export type SmartNotificationType =
  | "health"
  | "hunger"
  | "thirst"
  | "stamina"
  | "growth"
  | "prime"
  | "elder"
  | "support"
  | "update"
  | "death";

export type SmartNotificationPriority =
  | "info"
  | "success"
  | "warning"
  | "critical";

export type SmartNotification = {
  id: string;
  type: SmartNotificationType;
  priority: SmartNotificationPriority;
  title: string;
  message: string;
  value?: string;
  createdAt: number;
  expiresAt: number;
};

export type SmartNotificationSettings = {
  enabled: boolean;
  threshold: number;
  duration: number;
  types: Record<SmartNotificationType, boolean>;
};

export const DEFAULT_SMART_NOTIFICATION_SETTINGS: SmartNotificationSettings = {
  enabled: true,
  threshold: 20,
  duration: 5,
  types: {
    health: true,
    hunger: true,
    thirst: true,
    stamina: true,
    growth: true,
    prime: true,
    elder: true,
    support: true,
    update: true,
    death: true,
  },
};

const TYPE_LABELS: Record<SmartNotificationType, string> = {
  health: "Critical Health",
  hunger: "Low Hunger",
  thirst: "Low Thirst",
  stamina: "Low Stamina",
  growth: "Growth Complete",
  prime: "Prime Condition",
  elder: "Prime Elder",
  support: "Support",
  update: "Update",
  death: "Dinosaur Lost",
};

const ICONS: Record<SmartNotificationPriority, string> = {
  info: "◈",
  success: "✓",
  warning: "⚠",
  critical: "!",
};

function ratio(value?: number | null, max?: number | null) {
  if (
    typeof value !== "number" ||
    typeof max !== "number" ||
    !Number.isFinite(value) ||
    !Number.isFinite(max) ||
    max <= 0
  ) {
    return null;
  }

  return Math.max(0, Math.min(1, value / max));
}

function notificationId(type: SmartNotificationType, key: string) {
  return `${type}:${key}`;
}

function useSmartNotificationEngine(
  me: PlayerMe | null,
  settings: SmartNotificationSettings,
  supportUnread: number,
): SmartNotification[] {
  const [notifications, setNotifications] = useState<SmartNotification[]>([]);

  const previous = useRef<{
    healthLow: boolean;
    hungerLow: boolean;
    thirstLow: boolean;
    staminaLow: boolean;
    growthComplete: boolean;
    primeDone: Set<string>;
    elder: boolean;
    supportUnread: number;
  }>({
    healthLow: false,
    hungerLow: false,
    thirstLow: false,
    staminaLow: false,
    growthComplete: false,
    primeDone: new Set(),
    elder: false,
    supportUnread: 0,
  });

  const initialized = useRef(false);

  const push = (
    type: SmartNotificationType,
    priority: SmartNotificationPriority,
    title: string,
    message: string,
    value?: string,
  ) => {
    if (!settings.enabled || !settings.types[type]) return;

    const now = Date.now();
    const id = notificationId(type, `${title}:${message}`);

    setNotifications((current) => {
      if (current.some((n) => n.id === id)) return current;

      const next: SmartNotification = {
        id,
        type,
        priority,
        title,
        message,
        value,
        createdAt: now,
        expiresAt: now + settings.duration * 1000,
      };

      return [...current, next].slice(-5);
    });
  };

  useEffect(() => {
    if (!settings.enabled) {
      setNotifications([]);
      return;
    }

    const previousState = previous.current;

    if (!me?.hasData || !me.online || !me.species) {
      previousState.healthLow = false;
      previousState.hungerLow = false;
      previousState.thirstLow = false;
      previousState.staminaLow = false;
      previousState.growthComplete = false;
      previousState.primeDone.clear();
      previousState.elder = false;
      return;
    }

    const firstSnapshot = !initialized.current;
    initialized.current = true;

    const threshold =
      Math.max(1, Math.min(99, settings.threshold)) / 100;

    const health = ratio(me.health, me.maxHealth);
    const hunger = ratio(me.hunger, me.maxHunger);
    const thirst = ratio(me.thirst, me.maxThirst);
    const stamina = ratio(me.stamina, me.maxStamina);

    const healthLow = health !== null && health <= threshold;
    const hungerLow = hunger !== null && hunger <= threshold;
    const thirstLow = thirst !== null && thirst <= threshold;
    const staminaLow = stamina !== null && stamina <= threshold;

    if (!firstSnapshot) {
      if (healthLow && !previousState.healthLow) {
        push(
          "health",
          "critical",
          "CRITICAL HEALTH",
          "Your dinosaur's health is critically low.",
          `${Math.round((health ?? 0) * 100)}%`,
        );
      }

      if (hungerLow && !previousState.hungerLow) {
        push(
          "hunger",
          "warning",
          "LOW HUNGER",
          "Your dinosaur needs food.",
          `${Math.round((hunger ?? 0) * 100)}%`,
        );
      }

      if (thirstLow && !previousState.thirstLow) {
        push(
          "thirst",
          "warning",
          "LOW THIRST",
          "Your dinosaur needs water.",
          `${Math.round((thirst ?? 0) * 100)}%`,
        );
      }

      if (staminaLow && !previousState.staminaLow) {
        push(
          "stamina",
          "warning",
          "LOW STAMINA",
          "Your stamina is running low.",
          `${Math.round((stamina ?? 0) * 100)}%`,
        );
      }

      const growth =
        typeof me.growth === "number" ? me.growth : null;

      const growthComplete =
        growth !== null && growth >= 100;

      if (
        growthComplete &&
        !previousState.growthComplete
      ) {
        push(
          "growth",
          "success",
          "GROWTH COMPLETE",
          "Your dinosaur has reached full growth.",
          "100%",
        );
      }

      if (me.prime) {
        if (
          me.prime.elder &&
          !previousState.elder
        ) {
          push(
            "elder",
            "success",
            "PRIME ELDER",
            "You have achieved Prime Elder status.",
          );
        }

        const completed = new Set(
          me.prime.quests
            .filter((q) => q.done)
            .map((q) => q.name),
        );

        for (const quest of completed) {
          if (!previousState.primeDone.has(quest)) {
            push(
              "prime",
              "success",
              "PRIME CONDITION",
              quest,
            );
          }
        }

        previousState.primeDone = completed;
      }
    }

    previousState.healthLow = healthLow;
    previousState.hungerLow = hungerLow;
    previousState.thirstLow = thirstLow;
    previousState.staminaLow = staminaLow;

    previousState.growthComplete =
      typeof me.growth === "number" &&
      me.growth >= 100;

    previousState.elder = Boolean(me.prime?.elder);
    previousState.supportUnread = supportUnread;
  }, [me, settings, supportUnread]);

  useEffect(() => {
    const previousUnread = previous.current.supportUnread;

    if (
      settings.enabled &&
      settings.types.support &&
      supportUnread > previousUnread &&
      previousUnread >= 0
    ) {
      const difference = supportUnread - previousUnread;
      const now = Date.now();

      setNotifications((current): SmartNotification[] => {
        const id = notificationId(
          "support",
          String(supportUnread),
        );

        if (current.some((n) => n.id === id)) {
          return current;
        }

        const notification: SmartNotification = {
          id,
          type: "support",
          priority: "info",
          title: "SUPPORT MESSAGE",
          message:
            difference === 1
              ? "You have a new support message."
              : `You have ${difference} new support messages.`,
          value: String(supportUnread),
          createdAt: now,
          expiresAt: now + settings.duration * 1000,
        };

        return [...current, notification].slice(-5);
      });
    }

    previous.current.supportUnread = supportUnread;
  }, [supportUnread, settings]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();

      setNotifications((current) =>
        current.filter(
          (notification) =>
            notification.expiresAt > now,
        ),
      );
    }, 250);

    return () => window.clearInterval(timer);
  }, []);

  return notifications;
}

export function SmartNotificationLayer({
  me,
  settings,
  supportUnread,
  theme,
}: {
  me: PlayerMe | null;
  settings: SmartNotificationSettings;
  supportUnread: number;
  theme: OverlayTheme;
}) {
  const notifications =
    useSmartNotificationEngine(
      me,
      settings,
      supportUnread,
    );

  const visible = useMemo(
    () => [...notifications].reverse(),
    [notifications],
  );

  if (
    !settings.enabled ||
    visible.length === 0
  ) {
    return null;
  }

  return (
    <div
      className="smartNotifications"
      aria-live="polite"
    >
      {visible.map((notification) => (
        <div
          key={notification.id}
          className={`smartNotification smartNotification-${notification.priority}`}
          style={{
            ["--notification-accent" as string]:
              theme.accent,
          }}
        >
          <div className="smartNotificationIcon">
            {ICONS[notification.priority]}
          </div>

          <div className="smartNotificationBody">
            <div className="smartNotificationTitle">
              {notification.title}
            </div>

            <div className="smartNotificationMessage">
              {notification.message}
            </div>
          </div>

          {notification.value ? (
            <div className="smartNotificationValue">
              {notification.value}
            </div>
          ) : null}

          <div
            className="smartNotificationTimer"
            style={{
              animationDuration:
                `${settings.duration}s`,
            }}
          />
        </div>
      ))}
    </div>
  );
}

export function SmartNotificationSettings({
  settings,
  onChange,
}: {
  settings: SmartNotificationSettings;
  onChange: (
    settings: SmartNotificationSettings,
  ) => void;
}) {
  const updateType = (
    type: SmartNotificationType,
    enabled: boolean,
  ) => {
    onChange({
      ...settings,
      types: {
        ...settings.types,
        [type]: enabled,
      },
    });
  };

  return (
    <>
      <div className="secLabel">
        smart notifications
      </div>

      <div className="hint">
        The overlay watches the live data it already
        receives and only notifies you when something
        important changes.
      </div>

      <div className="featRow">
        <button
          className={`chip ${
            settings.enabled ? "on" : ""
          }`}
          onClick={() =>
            onChange({
              ...settings,
              enabled: !settings.enabled,
            })
          }
        >
          {settings.enabled ? "ON" : "OFF"}
        </button>
      </div>

      <div className="secLabel">
        low-stat threshold · {settings.threshold}%
      </div>

      <input
        className="range"
        type="range"
        min={5}
        max={50}
        step={5}
        value={settings.threshold}
        onChange={(e) =>
          onChange({
            ...settings,
            threshold: Number(e.target.value),
          })
        }
      />

      <div className="secLabel">
        notification duration · {settings.duration}s
      </div>

      <input
        className="range"
        type="range"
        min={2}
        max={12}
        step={1}
        value={settings.duration}
        onChange={(e) =>
          onChange({
            ...settings,
            duration: Number(e.target.value),
          })
        }
      />

      <div className="secLabel">
        notifications
      </div>

      <div
        className="featRow"
        style={{ flexWrap: "wrap" }}
      >
        {(
          Object.keys(TYPE_LABELS) as
            SmartNotificationType[]
        ).map((type) => (
          <button
            key={type}
            className={`chip ${
              settings.types[type] ? "on" : ""
            }`}
            onClick={() =>
              updateType(
                type,
                !settings.types[type],
              )
            }
          >
            {TYPE_LABELS[type]}
          </button>
        ))}
      </div>
    </>
  );
}