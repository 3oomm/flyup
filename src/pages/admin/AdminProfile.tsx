import { useState } from "react";
import { useSearchParams } from "react-router";
import AdminProfileTab from "../../components/admin/AdminProfileTab";
import NotificationTab from "../../components/pioneer/NotificationTab";
import PasswordTab from "../../components/pioneer/PasswordTab";

type Tab = "profile" | "notification" | "password";

const tabs: { key: Tab; label: string }[] = [
  { key: "profile", label: "โปรไฟล์" },
  { key: "notification", label: "การแจ้งเตือน" },
  { key: "password", label: "รหัสผ่าน" },
];

const validTabs: Tab[] = ["profile", "notification", "password"];

const AdminProfile = () => {
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") ?? "profile") as Tab;
  const [activeTab, setActiveTab] = useState<Tab>(
    validTabs.includes(initialTab) ? initialTab : "profile"
  );

  return (
    <div className="max-w-[670px] mx-auto">
      <h1 className="text-[24px] font-bold text-foreground mb-[24px]">ตั้งค่าโปรไฟล์</h1>

      {/* Tabs */}
      <div className="flex gap-[4px] bg-white border border-border rounded-[10px] p-[4px] w-fit mb-[24px]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-[16px] py-[8px] rounded-[8px] text-[14px] font-medium transition-colors cursor-pointer ${
              activeTab === tab.key
                ? "bg-primary text-white"
                : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "profile"      && <AdminProfileTab />}
      {activeTab === "notification" && <NotificationTab />}
      {activeTab === "password"     && <PasswordTab />}
    </div>
  );
};

export default AdminProfile;