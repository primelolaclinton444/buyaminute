import { NextResponse } from "next/server";

const profiles = [
  {
    id: "host-1",
    name: "Avery Park",
    username: "avery",
    rate: 4.5,
    tagline: "Rapid feedback on product launches & pitch decks.",
    categories: ["Startups", "Product"],
    status: "available",
  },
  {
    id: "host-2",
    name: "Ravi Singh",
    username: "ravi",
    rate: 3.8,
    tagline: "Go-to-market strategy and pricing reviews.",
    categories: ["Marketing", "Growth"],
    status: "busy",
  },
  {
    id: "host-3",
    name: "Taylor Chen",
    username: "taylor",
    rate: 5.2,
    tagline: "Hiring, leadership coaching, and team scaling.",
    categories: ["Leadership", "People"],
    status: "available",
  },
  {
    id: "host-4",
    name: "Nova Reed",
    username: "nova",
    rate: 2.5,
    tagline: "Copy edits, content strategy, and brand voice.",
    categories: ["Content", "Brand"],
    status: "offline",
  },
];

export async function GET() {
  return NextResponse.json({
    categories: ["All", "Startups", "Product", "Marketing", "Leadership", "Brand"],
    featured: profiles.slice(0, 2),
    profiles,
  });
}
