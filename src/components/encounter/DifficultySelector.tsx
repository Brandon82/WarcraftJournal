import { Segmented } from 'antd';
import { Difficulty, DIFFICULTY_LABELS } from '../../types';
import { useJournal } from '../../context/JournalContext';

const OPTIONS = Object.values(Difficulty).map((d) => ({
  label: DIFFICULTY_LABELS[d],
  value: d,
}));

export default function DifficultySelector() {
  const { difficulty, setDifficulty } = useJournal();

  return (
    <Segmented
      options={OPTIONS}
      value={difficulty}
      onChange={(val) => setDifficulty(val as Difficulty)}
    />
  );
}
