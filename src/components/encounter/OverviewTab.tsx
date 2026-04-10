import {
  SafetyOutlined,
  MedicineBoxOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type { JournalSection } from '../../types';

interface OverviewTabProps {
  overviewSection?: JournalSection;
  description: string;
}

const ROLE_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  Tank: {
    icon: <SafetyOutlined />,
    color: '#3b82f6',
  },
  Healer: {
    icon: <MedicineBoxOutlined />,
    color: '#22c55e',
  },
  'Damage Dealer': {
    icon: <ThunderboltOutlined />,
    color: '#ef4444',
  },
};

export default function OverviewTab({ overviewSection, description }: OverviewTabProps) {
  const roleAlerts = overviewSection?.sections?.filter(
    (s) => s.title in ROLE_CONFIG,
  );

  return (
    <div>
      <p className="text-wow-text text-[15px] leading-relaxed mb-6 m-0">
        {description}
      </p>

      {overviewSection?.bodyText && (
        <p className="text-wow-text-secondary text-sm leading-relaxed mb-6 m-0">
          {overviewSection.bodyText}
        </p>
      )}

      {roleAlerts && roleAlerts.length > 0 && (
        <div className="flex flex-col gap-3">
          {roleAlerts.map((alert) => {
            const config = ROLE_CONFIG[alert.title];
            return (
              <div
                key={alert.id}
                className="rounded-xl border border-wow-border bg-wow-bg-surface p-4"
                style={{ borderLeftWidth: '4px', borderLeftColor: config?.color }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span style={{ color: config?.color }}>
                    {config?.icon}
                  </span>
                  <h4 className="text-wow-text font-medium m-0 text-sm">
                    {alert.title}
                  </h4>
                </div>
                {alert.bodyText && (
                  <p className="text-wow-text-secondary text-sm m-0 ml-7 leading-relaxed">
                    {alert.bodyText}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
