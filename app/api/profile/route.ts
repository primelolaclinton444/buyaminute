import { NextResponse } from "next/server";

const profiles = new Map([
  ["avery", {
    id: "host-1",
    name: "Avery Park",
    username: "avery",
    rate: 4.5,
    tagline: "Rapid feedback on product launches & pitch decks.",
    categories: ["Startups", "Product"],
    status: "available",
    bio: "Former head of product at a Series B. I help founders shape their launch story and build trust with investors.",
    responseTime: "Replies in ~10 minutes",
    languages: ["English", "Spanish"],
    reviews: [
      {
        id: "rev-1",
        author: "Morgan",
        rating: 5,
        quote: "Tight feedback and actionable next steps. Loved it.",
      },
      {
        id: "rev-2",
        author: "Chris",
        rating: 4,
        quote: "Helped us tighten our investor deck in 15 minutes.",
      },
    ],
  }],
  ["ravi", {
    id: "host-2",
    name: "Ravi Singh",
    username: "ravi",
    rate: 3.8,
    tagline: "Go-to-market strategy and pricing reviews.",
    categories: ["Marketing", "Growth"],
    status: "busy",
    bio: "Growth advisor with a focus on PLG onboarding and conversion experiments.",
    responseTime: "Usually within 25 minutes",
    languages: ["English", "Hindi"],
    reviews: [
      {
        id: "rev-3",
        author: "Alina",
        rating: 5,
        quote: "Great framework for our onboarding funnel.",
      },
    ],
  }],
  ["taylor", {
    id: "host-3",
    name: "Taylor Chen",
    username: "taylor",
    rate: 5.2,
    tagline: "Hiring, leadership coaching, and team scaling.",
    categories: ["Leadership", "People"],
    status: "available",
    bio: "People leader helping teams scale from 5 to 50+ while keeping culture intact.",
    responseTime: "Typically same-day",
    languages: ["English", "Mandarin"],
    reviews: [
      {
        id: "rev-4",
        author: "Jordan",
        rating: 5,
        quote: "So helpful with our hiring plan and interview loops.",
      },
    ],
  }],
  ["nova", {
    id: "host-4",
    name: "Nova Reed",
    username: "nova",
    rate: 2.5,
    tagline: "Copy edits, content strategy, and brand voice.",
    categories: ["Content", "Brand"],
    status: "offline",
    bio: "Editor and strategist helping teams sharpen their narrative with clarity.",
    responseTime: "Next business day",
    languages: ["English"],
    reviews: [
      {
        id: "rev-5",
        author: "Lee",
        rating: 4,
        quote: "Clear, empathetic edits that kept our tone intact.",
      },
    ],
  }],
]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username") ?? "avery";
  const profile = profiles.get(username) ?? profiles.get("avery");

  return NextResponse.json({ profile });
}
