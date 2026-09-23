import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { useNotificationStore } from "../../store/useNotificationStore";

interface NotifItem {
  key: string;
  label: string;
  desc: string;
  defaultOn: boolean;
}

const notifItems: NotifItem[] = [
  { key: "new_investment", label: "การลงทุน",    desc: "แจ้งเมื่อมีการลงทุนใหม่",              defaultOn: true },
  { key: "milestone",      label: "Milestone",   desc: "แจ้งเมื่อมีการส่งงานหรืออนุมัติ",      defaultOn: true },
  { key: "meeting",        label: "การประชุม",   desc: "แจ้งเมื่อมีนัดหมายใหม่",               defaultOn: true },
  { key: "vote",           label: "การโหวต",     desc: "แจ้งเมื่อมีเหตุหรือปิดการโหวต",        defaultOn: true  },
  { key: "profit",         label: "กำไร",         desc: "แจ้งเมื่อมีการแจกจ่ายกำไร",            defaultOn: true  },
  { key: "complaint",      label: "การร้องเรียน", desc: "แจ้งเมื่อมีสิทธิพิเศษเรื่องร้องเรียน", defaultOn: true  },
];

const defaultToggles = Object.fromEntries(notifItems.map((n) => [n.key, n.defaultOn]));

function safePrefs(raw: unknown): Record<string, boolean> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, boolean>;
  }
  return {};
}

const NotificationTab = () => {
  const authUser = useAuthStore((s) => s.authUser);
  const { fetchNotificationPreferences, updateNotificationPreferences } = useNotificationStore();

  const [toggles, setToggles] = useState<Record<string, boolean>>(() => ({
    ...defaultToggles,
    ...safePrefs(authUser?.notification_preferences),
  }));
  const [saving, setSaving] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchNotificationPreferences().then((prefs) => {
      if (prefs) setToggles({ ...defaultToggles, ...prefs });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = (key: string) => {
    const newValue = !toggles[key];
    const newToggles = { ...toggles, [key]: newValue };
    setToggles(newToggles);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSaving(key);
      const ok = await updateNotificationPreferences(newToggles);
      if (!ok) setToggles((prev) => ({ ...prev, [key]: !newValue }));
      setSaving(null);
    }, 400);
  };

  return (
    <div className="bg-white border border-border rounded-[16px] p-[24px] flex flex-col gap-[4px]">
      <div className="flex items-center gap-[8px] mb-[16px]">
        <Bell size={18} className="text-foreground" />
        <h2 className="font-semibold text-foreground">ตั้งค่าการแจ้งเตือน</h2>
      </div>

      {notifItems.map((item, idx) => (
        <div
          key={item.key}
          className={`flex items-center justify-between py-[16px] ${idx < notifItems.length - 1 ? "border-b border-border" : ""}`}
        >
          <div>
            <p className="text-[14px] font-medium text-foreground">{item.label}</p>
            <p className="text-[12px] text-muted-foreground mt-[2px]">{item.desc}</p>
          </div>
          <button
            data-testid={`notification-toggle-${item.key}`}
            onClick={() => handleToggle(item.key)}
            disabled={saving === item.key}
            className={`w-[48px] h-[26px] rounded-full transition-colors duration-200 relative cursor-pointer ${
              toggles[item.key] ? "bg-primary" : "bg-surface-raised"
            }`}
          >
            <span
              className={`absolute top-[3px] w-[20px] h-[20px] rounded-full bg-white shadow transition-[left] duration-200 ease-in-out ${
                toggles[item.key] ? "left-[25px]" : "left-[3px]"
              }`}
            />
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationTab;
