import { Button, Popover } from 'antd';
import { BgColorsOutlined } from '@ant-design/icons';
import {
  DEFAULT_NAMEPLATE_COLORS,
  NAMEPLATE_TIER_LABELS,
  NAMEPLATE_TIER_ORDER,
  useNameplateColors,
} from '../context/NameplateColorsContext';

function NameplateColorsPanel() {
  const { colors, setColor, resetColors } = useNameplateColors();
  return (
    <div className="w-56 p-1">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-wow-gold">Nameplate colors</span>
        <Button size="small" type="text" onClick={resetColors}>
          Reset
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        {NAMEPLATE_TIER_ORDER.map((tier) => (
          <label
            key={tier}
            className="flex items-center justify-between gap-3 text-sm text-wow-text"
          >
            <span
              className="font-semibold"
              style={{ color: colors[tier] }}
            >
              {NAMEPLATE_TIER_LABELS[tier]}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-wow-text-secondary font-mono uppercase">
                {colors[tier]}
              </span>
              <input
                type="color"
                value={colors[tier]}
                onChange={(e) => setColor(tier, e.target.value.toUpperCase())}
                className="w-7 h-7 rounded cursor-pointer border border-wow-border bg-transparent p-0"
                aria-label={`${NAMEPLATE_TIER_LABELS[tier]} color`}
                title={`Default: ${DEFAULT_NAMEPLATE_COLORS[tier]}`}
              />
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

/** Header button that opens a popover to customize per-tier NPC name colors. */
export default function NameplateColorsSettings() {
  return (
    <Popover
      content={<NameplateColorsPanel />}
      trigger="click"
      placement="bottomRight"
    >
      <button
        type="button"
        className="bg-transparent border border-wow-border rounded-xl cursor-pointer text-wow-text-secondary text-sm p-2.5 sm:p-2 flex items-center hover:text-wow-text hover:bg-wow-bg-elevated transition-all duration-150"
        title="Nameplate colors"
      >
        <BgColorsOutlined />
      </button>
    </Popover>
  );
}
