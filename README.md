# Local Fibre Website

A community-focused website for Local Fibre, a non-profit initiative centered around social sewing, creative mending, and zero-waste textile education in Aotearoa.

## Features

- ✅ Responsive, mobile-first design
- ✅ SEO-friendly
- ✅ Accessible (WCAG-friendly)
- ✅ Fast loading
- ✅ Newsletter signup form
- ✅ Event listings
- ✅ Pattern download pages
- ✅ Contact form

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- CSS Modules
- ESLint

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

## Adding Your Assets

### Logo Files

Replace the placeholder logo files with your actual logos:

1. **Header Logo**: Replace `/public/images/logo.svg` with your logo
2. **Banner Logo**: Replace `/public/images/banner-logo.svg` with your banner logo

Recommended formats: SVG (preferred) or PNG with transparent background.

### Font Files

If you have the Cream Wish font files:

1. Place the font files (`.woff2` and `.woff`) in `/public/fonts/`
2. Update the font file names in `/src/app/globals.css` if needed

The site currently uses Inter as a fallback if Cream Wish is not available.

### Pattern Images

Replace pattern illustrations in `/public/images/patterns/`:
- `kitten-vest.svg`
- `gather-blouse.svg`
- `hot-water-bottle.svg`

### Pattern PDFs

Add your actual pattern PDF files to `/public/patterns/`:
- `kitten-vest.pdf`
- `gather-blouse.pdf`
- `hot-water-bottle.pdf`

Update the PDF URLs in `/src/data/patterns.ts` if your file names differ.

## Editing Content

### Events

Edit `/src/data/events.ts` to add, update, or remove events. The data structure includes:
- `title`: Event name
- `date`: Date string
- `time`: Time range
- `location`: Venue location
- `description`: Full event description
- `registerLink`: Registration URL
- `isUpcoming`: Boolean to show/hide in upcoming events

### Patterns

Edit `/src/data/patterns.ts` to manage downloadable patterns:
- `title`: Pattern name
- `description`: Pattern description
- `image`: Path to pattern image
- `pdfUrl`: Path to PDF file
- `category`: Optional category

### Home Page Content

Main content sections are in `/src/app/page.tsx`. Edit the text directly in the component.

### Other Pages

- About: Currently included on the home page (can be extracted to separate page if needed)
- Contact: `/src/app/contact/page.tsx`
- Footer: `/src/components/layout/Footer.tsx`

## Newsletter Integration

The newsletter form is currently set up as a placeholder. To integrate with Mailchimp:

1. Get your Mailchimp signup form action URL
2. Update `/src/components/forms/NewsletterForm.tsx` to submit to Mailchimp's API
3. Or use Mailchimp's embed code in the component

## Contact Form Integration

The contact form is currently a placeholder. To make it functional:

1. Set up an API route in `/src/app/api/contact/route.ts`
2. Update `/src/components/forms/ContactForm.tsx` to submit to your API
3. Add email service (e.g., Resend, SendGrid) or connect to your backend

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Deploy automatically

### Other Platforms

The site is static-friendly and can be deployed to:
- Netlify
- AWS Amplify
- Any static hosting service

## Environment Variables

Currently no environment variables are required. If you add:
- Newsletter API keys
- Contact form endpoints
- Analytics IDs

Create a `.env.local` file (not committed to git) with your keys.

## Customization

### Colors

Edit CSS variables in `/src/app/globals.css`:
- `--color-heading`: #7f340b
- `--color-body`: #411f0a
- Accent colors can be adjusted in the same file

### Typography

- Heading font: Cream Wish (configured in `globals.css`)
- Body font: Inter (from Google Fonts, configured in `layout.tsx`)

## Future Enhancements

Planned features (not yet implemented):
- Event booking system integration
- Blog/articles section
- Gallery
- Donations/koha option
- Integrated shop

## License

© 2025 Local Fibre. All rights reserved.
