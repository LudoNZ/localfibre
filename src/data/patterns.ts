export interface Pattern {
  id: string;
  title: string;
  description: string;
  image: string;
  pdfUrl: string;
  category?: string;
}

export const patterns: Pattern[] = [
  {
    id: "1",
    title: "Kitten Vest",
    description:
      "A cozy, sustainable vest pattern perfect for upcycling old sweaters or using scrap fabric. Easy to customize and size-adjust.",
    image: "/images/patterns/kitten-vest.svg",
    pdfUrl: "/patterns/kitten-vest.pdf",
    category: "Clothing",
  },
  {
    id: "2",
    title: "Gather Blouse",
    description:
      "A relaxed-fit blouse with beautiful gathered details. Perfect for beginner to intermediate sewers, with clear step-by-step instructions.",
    image: "/images/patterns/gather-blouse.svg",
    pdfUrl: "/patterns/gather-blouse.pdf",
    category: "Clothing",
  },
  {
    id: "3",
    title: "Hot Water Bottle Cover",
    description:
      "Keep your hot water bottle cozy with this simple, practical cover pattern. Great for using up fabric scraps and makes a thoughtful gift.",
    image: "/images/patterns/hot-water-bottle.svg",
    pdfUrl: "/patterns/hot-water-bottle.pdf",
    category: "Home",
  },
];

