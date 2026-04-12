import { useMemo } from 'react';
import { Segmented } from 'antd';
import { Difficulty, DIFFICULTY_LABELS } from '../../types';
import { useJournal } from '../../context/JournalContext';

interface DifficultySelectorProps {
  supportedModes?: string[];
}

const ALL_OPTIONS = Object.values(Difficulty).map((d) => ({
  label: DIFFICULTY_LABELS[d],
  value: d,
}));

// Map Blizzard mode types to our Difficulty enum values
const MODE_TO_DIFFICULTY: Record<string, Difficulty> = {
  lfr: Difficulty.LFR,
  normal: Difficulty.Normal,
  heroic: Difficulty.Heroic,
  mythic: Difficulty.Mythic,
  mythic_keystone: Difficulty.Mythic,
};

export default function DifficultySelector({ supportedModes }: DifficultySelectorProps) {
  const { difficulty, setDifficulty } = useJournal();

  const options = useMemo(() => {
    if (!supportedModes || supportedModes.length === 0) return ALL_OPTIONS;
    const supported = new Set(
      supportedModes.map((m) => MODE_TO_DIFFICULTY[m]).filter(Boolean),
    );
    return ALL_OPTIONS.filter((o) => supported.has(o.value));
  }, [supportedModes]);

  // If current difficulty isn't supported, don't render an invalid state
  const effectiveDifficulty =
    options.some((o) => o.value === difficulty) ? difficulty : options[0]?.value;

  if (options.length <= 1) return null;

  return (
    <div className="max-w-full overflow-x-auto">
      <Segmented
        options={options}
        value={effectiveDifficulty}
        onChange={(val) => setDifficulty(val as Difficulty)}
      />
    </div>
  );
}
