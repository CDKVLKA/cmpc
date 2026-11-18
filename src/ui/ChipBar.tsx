import { CHIP_ORDER, type ChipId } from "../lib/chips";
import type { StringKey } from "../i18n";
import { useCollection } from "../state/collection";

const LABELS: Record<ChipId, StringKey> = {
  all: "chipAll",
  favorites: "chipFavorites",
  curated: "chipCurated",
  hidden: "chipHidden",
  underground: "chipUnderground",
  racing: "chipRacing",
  handheld: "chipHandheld",
};

export function ChipBar({ value, onChange }: { value: ChipId; onChange: (chip: ChipId) => void }) {
  const { t } = useCollection();
  return (
    <div className="presets" role="toolbar" aria-label={t("chipAll")}>
      {CHIP_ORDER.map((chip) => (
        <button key={chip} type="button" className={value === chip ? "on" : ""} aria-pressed={value === chip} onClick={() => onChange(chip)}>
          {t(LABELS[chip])}
        </button>
      ))}
    </div>
  );
}
