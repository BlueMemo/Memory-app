import type { Deck } from "@/lib/types";

export const largestCountries: Deck = {
  id: "largest-countries",
  title: "The 10 largest countries by population",
  description: "Walk a route through your home and place one vivid object per country, from India to Ethiopia.",
  language: "en",
  kind: "ordered",
  orderLabel: "by population",
  official: true,
  showAnswerInWalkthrough: false,
  instructions: [
    "Select a location that you know well, preferably your home. Then, place the following images in order along a route through your chosen location.",
    "Make sure that each image is placed in a separate, clearly distinct location along the route. When you later try to remember the images, focus on **visualizing the image itself** rather than remembering the written description of it.",
  ],
  notes: [
    {
      beforeCard: 2,
      badge: "GREAT START",
      title: "Now on your own",
      body: "From here on there are **no pictures** and **no suggested spots**. For each new object, choose your own **separate, clearly distinct spot** further along your route.",
    },
    {
      beforeCard: 8,
      badge: "LAST TWO STOPS",
      title: "Create your own",
      body: "For the last two stops, **Russia** and **Ethiopia**, no object is given. **Make up your own** association object for each country, **picture it vividly**, and place it at the next two spots on your route.",
    },
  ],
  testQuestion: {
    first: "Which is the most populated country in the world?",
    other: "Which is the {ordinal} most populated country in the world?",
  },
  cards: [
    {
      id: "india",
      answer: "India",
      details: "≈ 1.46 billion people",
      object: "Tikka masala",
      visualization: "A pile of tikka masala next to your front door.",
      illustration: { name: "tikka-door" },
    },
    {
      id: "china",
      answer: "China",
      details: "≈ 1.42 billion people",
      object: "Chopsticks",
      visualization: "Pass through the door and discover a pair of chopsticks where you would place your shoes.",
      illustration: { name: "shoes-chopsticks" },
    },
    { id: "united-states", answer: "United States", details: "≈ 347 million people", object: "An American football" },
    { id: "indonesia", answer: "Indonesia", details: "≈ 286 million people", object: "An archipelago" },
    { id: "pakistan", answer: "Pakistan", details: "≈ 255 million people", object: "A packet" },
    {
      id: "nigeria",
      answer: "Nigeria",
      details: "≈ 238 million people",
      object: "The Nigerian flag",
      illustration: { name: "nigeria-flag", side: "left" },
    },
    { id: "brazil", answer: "Brazil", details: "≈ 213 million people", object: "A football" },
    { id: "bangladesh", answer: "Bangladesh", details: "≈ 176 million people", object: "The Big Bang" },
    { id: "russia", answer: "Russia", details: "≈ 144 million people", suggestion: "a polar bear" },
    { id: "ethiopia", answer: "Ethiopia", details: "≈ 135 million people", suggestion: "an antelope" },
  ],
};
