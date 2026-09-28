import type { ReactNode } from "react";
import { Button, Drawer, Space, Tag } from "antd";
import type { Application } from "../lib/selections";

interface ApplicationDrawerProps {
  record: Application | null;
  rankingKey: string;
  position: { index: number; total: number };
  actions: ReactNode;
  otherTeams: ReactNode;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}

const ESSAYS: { question: string; key: keyof Application }[] = [
  {
    question: "Why do you want to join JumboCode? What do you hope to gain?",
    key: "why_join_jumbocode",
  },
  {
    question:
      "Experience with volunteering, non-profits, community engagement, or social good activism",
    key: "volunteering_experience",
  },
  { question: "Tell us about a project you're proud of", key: "project_proud_of" },
  { question: "What aspect of developing do you enjoy the most?", key: "favorite_development_aspect" },
  { question: "First introduction to computer science", key: "intro_to_cs" },
  { question: "Project preference elaboration", key: "preferences_elaboration" },
  { question: "Anything else they want us to know", key: "additional_info" },
];

// Matches http(s) URLs and bare domains like "github.com/user" or "site.netlify.app".
const LINK_PATTERN =
  /(https?:\/\/[^\s,]+|(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|org|net|io|app|dev|edu|me|co|ai|xyz|page|site)(?:\/[^\s,]*)?)/gi;

function Linkified(props: { text: string }) {
  const parts = props.text.split(LINK_PATTERN);
  return (
    <>
      {parts.map((part, index) => {
        if (index % 2 === 0) return part;
        const href = /^https?:\/\//i.test(part) ? part : `https://${part}`;
        return (
          <a
            key={index}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-blue-600 underline"
          >
            {part}
          </a>
        );
      })}
    </>
  );
}

function Fact(props: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={props.wide ? "sm:col-span-2" : undefined}>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {props.label}
      </dt>
      <dd className="mt-0.5 text-gray-900">{props.children}</dd>
    </div>
  );
}

function answer(value: unknown): ReactNode {
  const text = value === null || value === undefined ? "" : String(value).trim();
  return text ? text : <span className="text-gray-400">No answer</span>;
}

const ApplicationDrawer = (props: ApplicationDrawerProps) => {
  const record = props.record;

  return (
    <Drawer
      open={record !== null}
      onClose={props.onClose}
      width={720}
      title={
        record && (
          <div className="flex flex-wrap items-center gap-2">
            <span>{record.fake_name}</span>
            <Tag color="blue">Ranked us #{String(record[props.rankingKey] ?? "?")}</Tag>
            <Tag>{record.class_year}</Tag>
          </div>
        )
      }
      extra={
        <Space>
          <Button onClick={props.onPrevious} disabled={props.position.index <= 0}>
            Previous
          </Button>
          <span className="text-sm text-gray-500 tabular-nums">
            {props.position.index + 1} / {props.position.total}
          </span>
          <Button
            onClick={props.onNext}
            disabled={props.position.index >= props.position.total - 1}
          >
            Next
          </Button>
        </Space>
      }
    >
      {record && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            {props.actions}
            {props.otherTeams}
          </div>

          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <Fact label="Pronouns">{answer(record.pronouns)}</Fact>
            <Fact label="Class year">{answer(record.class_year)}</Fact>
            <Fact label="Underrepresented in STEM">
              {answer(record.underrepresented_group_in_stem)}
            </Fact>
            <Fact label="Previous JumboCode developer">
              {answer(record.previous_jumbocode_developer)}
            </Fact>
            <Fact label="In person this semester">
              {answer(record.in_person_this_semester)}
            </Fact>
            <Fact label="In person next semester">
              {answer(record.in_person_next_semester)}
            </Fact>
            <Fact label="DevOps interest">{answer(record.devops_interest)}</Fact>
            <Fact label="Mentorship interest">{answer(record.mentorship_interest)}</Fact>
            <Fact label="Weekly meeting availability" wide>
              {answer(record.weekly_meeting_availability)}
            </Fact>
            <Fact label="Classes taken" wide>
              {answer(record.classes_taken)}
            </Fact>
            <Fact label="Technologies & skills" wide>
              {answer(record.technologies)}
            </Fact>
            <Fact label="Links" wide>
              {record.links?.trim() ? <Linkified text={record.links} /> : answer("")}
            </Fact>
            {record.board_notes?.trim() ? (
              <Fact label="Board notes" wide>
                {record.board_notes}
              </Fact>
            ) : null}
          </dl>

          {ESSAYS.map((essay) => (
            <section key={essay.key as string}>
              <h3 className="mb-1 border-t border-gray-100 pt-4 text-base font-semibold">
              {essay.question}
            </h3>
              <p className="whitespace-pre-line leading-relaxed text-gray-800">
                {answer(record[essay.key])}
              </p>
            </section>
          ))}
        </div>
      )}
    </Drawer>
  );
};

export default ApplicationDrawer;
