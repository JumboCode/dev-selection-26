import { useMemo, useState } from "react";
import { Checkbox, Tag } from "antd";
import {
  type Application,
  normalizePronouns,
  SELECTED_RANGE,
  selectionForTeam,
  WAITLISTED_RANGE,
} from "../lib/selections";

interface TeamSummaryProps {
  data: Application[];
  team: string;
}

interface Breakdown {
  title: string;
  value: (record: Application) => string;
}

const BREAKDOWNS: Breakdown[] = [
  { title: "Class year", value: (record) => record.class_year || "Unknown" },
  { title: "Pronouns", value: (record) => normalizePronouns(record.pronouns) },
  {
    title: "Underrepresented in STEM",
    value: (record) => record.underrepresented_group_in_stem || "No answer",
  },
  {
    title: "Previous JumboCode developer",
    value: (record) => record.previous_jumbocode_developer || "No answer",
  },
  {
    title: "In person next semester",
    value: (record) => record.in_person_next_semester || "No answer",
  },
];

function countBy(records: Application[], value: (record: Application) => string) {
  const counts = new Map<string, number>();
  records.forEach((record) => {
    const key = value(record);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], undefined, { numeric: true }),
  );
}

function CountTag(props: {
  label: string;
  count: number;
  range?: { min: number; max: number };
}) {
  const inRange =
    !props.range || (props.count >= props.range.min && props.count <= props.range.max);
  return (
    <div className="rounded-lg border border-gray-200 px-4 py-2">
      <div className="text-sm text-gray-500">{props.label}</div>
      <div className="text-2xl font-semibold">
        {props.count}
        {props.range && (
          <span className="ml-1 text-sm font-normal text-gray-500">
            / {props.range.min}–{props.range.max}
          </span>
        )}
      </div>
      {props.range && (
        <Tag color={inRange ? "green" : "orange"} className="mt-1">
          {inRange ? "Ready" : props.count < props.range.min ? "Need more" : "Too many"}
        </Tag>
      )}
    </div>
  );
}

const TeamSummary = (props: TeamSummaryProps) => {
  const [includeWaitlist, setIncludeWaitlist] = useState(false);

  const byType = useMemo(() => {
    const groups = { selected: [], waitlisted: [], saved: [] } as Record<
      "selected" | "waitlisted" | "saved",
      Application[]
    >;
    props.data.forEach((record) => {
      const type = selectionForTeam(record, props.team)?.selection_type;
      if (type) groups[type].push(record);
    });
    return groups;
  }, [props.data, props.team]);

  const statsRecords = includeWaitlist
    ? [...byType.selected, ...byType.waitlisted]
    : byType.selected;

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <CountTag label="Selected" count={byType.selected.length} range={SELECTED_RANGE} />
        <CountTag
          label="Waitlisted"
          count={byType.waitlisted.length}
          range={WAITLISTED_RANGE}
        />
        <CountTag label="Saved for later" count={byType.saved.length} />
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-500">
          Breakdown of {statsRecords.length} developer
          {statsRecords.length === 1 ? "" : "s"}. Pronouns stand in for gender
          because the application doesn't ask about it.
        </p>
        <Checkbox
          checked={includeWaitlist}
          onChange={(event) => setIncludeWaitlist(event.target.checked)}
        >
          Include waitlist
        </Checkbox>
      </div>

      {statsRecords.length === 0 ? (
        <p className="text-gray-500">Select developers to see your team's makeup.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {BREAKDOWNS.map((breakdown) => (
            <div key={breakdown.title}>
              <p className="mb-1 font-semibold">{breakdown.title}</p>
              {countBy(statsRecords, breakdown.value).map(([label, count]) => (
                <div key={label} className="mb-1 flex items-center gap-2 text-sm">
                  <span className="w-40 shrink-0 truncate" title={label}>
                    {label}
                  </span>
                  <div className="h-3 flex-1 rounded bg-gray-100">
                    <div
                      className="h-3 rounded bg-blue-500"
                      style={{ width: `${(count / statsRecords.length) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right tabular-nums">{count}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamSummary;
