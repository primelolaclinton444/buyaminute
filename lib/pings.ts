import { AvailabilityQuestion, AvailabilityResponse } from "@/lib/domain";

export const PING_QUESTION_OPTIONS: Array<{
  id: AvailabilityQuestion;
  label: string;
}> = [
  { id: "available_now", label: "Available now?" },
  { id: "available_later", label: "Available later today?" },
  { id: "when_good_time", label: "When’s a good time?" },
];

export const PING_RESPONSE_LABELS: Record<AvailabilityResponse, string> = {
  available_now: "Available now",
  available_later: "Available later",
  not_available: "Not available",
};

export const PING_QUESTION_LABELS: Record<AvailabilityQuestion, string> =
  PING_QUESTION_OPTIONS.reduce(
    (acc, option) => ({ ...acc, [option.id]: option.label }),
    {} as Record<AvailabilityQuestion, string>
  );

const QUESTION_LOOKUP = new Map(
  PING_QUESTION_OPTIONS.flatMap((option) => [
    [option.id, option.id],
    [option.label.toLowerCase(), option.id],
  ])
);

export function parseAvailabilityQuestion(topic: string | null | undefined) {
  if (!topic) return null;
  const normalized = topic.trim().toLowerCase();
  return QUESTION_LOOKUP.get(normalized) ?? null;
}
