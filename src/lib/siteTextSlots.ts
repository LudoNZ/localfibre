// Every piece of page text an admin can change in edit mode, with the wording it starts with.
// Shared between the server (loading text) and the in-place editor.
//
// Multi-line slots split into paragraphs on blank lines. Any slot can hold links
// written as [link text](/page) or [email us](mailto:hello@localfibre.co.nz).

import { site } from "@/data/site"

interface TextSlot {
  label: string
  text: string
  multiline?: boolean
}

const slot = (label: string, text: string, multiline = false): TextSlot => ({ label, text, multiline })

export const TEXT_SLOTS = {
  // Used on more than one page
  "site.mission": slot("Mission (home and About)", site.mission, true),

  // Home
  "home.hero.eyebrow": slot("Home: hero label", `Community sewing · ${site.region}`),
  "home.hero.title": slot("Home: hero title", "Mend. Make."),
  "home.hero.highlight": slot("Home: hero title highlight", "Connect."),
  "home.hero.tagline": slot(
    "Home: hero text",
    "Local Fibre brings people together to sew, mend and repair, and gives donated sewing machines a second life with people who need them.",
    true
  ),
  "home.programme.eyebrow": slot("Home: programme label", "Our programme"),
  "home.programme.title": slot("Home: programme title", "Sewing Machine Repair Programme"),
  "home.programme.intro": slot(
    "Home: programme text",
    "Good sewing machines too often end up in storage or landfill, while people who want to sew can't afford one. We collect donated machines, service them, and rehome them with individuals and community groups across Auckland.",
    true
  ),
  "home.programme.step1": slot("Home: programme step 1", "Machines are donated"),
  "home.programme.step2": slot("Home: programme step 2", "We service and repair them"),
  "home.programme.step3": slot("Home: programme step 3", "They go to someone on our waiting list"),
  "home.programme.recipients": slot("Home: groups label", "Machines have gone to groups including"),
  "home.about.eyebrow": slot("Home: what we do label", "What we do"),
  "home.about.title": slot("Home: what we do title", "Making, mending and keeping textiles in use"),
  "home.offering1.title": slot("Home: card 1 title", "Social sewing"),
  "home.offering1.text": slot(
    "Home: card 1 text",
    "Relaxed sessions where makers of every skill level bring their own projects, share tips and enjoy good company.",
    true
  ),
  "home.offering2.title": slot("Home: card 2 title", "Fabric swap events"),
  "home.offering2.text": slot(
    "Home: card 2 text",
    "Bring the fabric, yarn, haberdashery and patterns you no longer need, and take home something new to you, keeping textiles in use and out of landfill.",
    true
  ),
  "home.offering3.title": slot("Home: card 3 title", "Machine repair & rehoming"),
  "home.offering3.text": slot(
    "Home: card 3 text",
    "Donated sewing machines are serviced and rehomed with people and community groups who will put them to use.",
    true
  ),
  "home.events.eyebrow": slot("Home: events label", "Events"),
  "home.events.title": slot("Home: events title", "Upcoming events"),
  "home.events.intro": slot(
    "Home: events text",
    "Join us for Social Sewing, Fabric Swaps and other community sewing events around West Auckland.",
    true
  ),
  "home.events.empty": slot("Home: no events message", "No upcoming events scheduled. Check back soon!"),
  "home.resources.eyebrow": slot("Home: resources label", "Free to download"),
  "home.resources.title": slot("Home: resources title", "Resources"),
  "home.resources.intro": slot("Home: resources text", "Resource-sharing for a creative, low-waste Aotearoa.", true),
  "home.resources.empty": slot("Home: no resources message", "Resources coming soon! Check back later."),
  "home.resources.koha": slot(
    "Home: koha note",
    "All resources are free to download. If you'd like to support our work, koha (donation) options will be available soon.",
    true
  ),
  "home.partners.eyebrow": slot("Home: partners label", "Thank you"),
  "home.partners.title": slot("Home: partners title", "Partners & supporters"),
  "home.newsletter.title": slot("Home: newsletter title", "Stay in the loop"),
  "home.newsletter.text": slot(
    "Home: newsletter text",
    "Updates on events, workshops, machines and community news. No spam, ever.",
    true
  ),
  "home.contact.eyebrow": slot("Home: contact label", "Contact"),
  "home.contact.title": slot("Home: contact title", "Get in touch"),
  "home.contact.intro": slot(
    "Home: contact text",
    "Questions, a machine to donate, or want to get involved? We'd love to hear from you.",
    true
  ),
  "home.contact.formTitle": slot("Home: contact form title", "Send us a message"),

  // About
  "about.hero.eyebrow": slot("About: hero label", "About us"),
  "about.hero.title": slot("About: hero title", "Sewing, mending and community in West Auckland"),
  "about.story.eyebrow": slot("About: story label", "Our story"),
  "about.story.title": slot("About: story title", "Why Local Fibre exists"),
  "about.story.body": slot(
    "About: story text",
    "Local Fibre offers welcoming spaces for fibre crafters of all kinds (sewists, knitters, stitchers, upcyclers, weavers and curious beginners) to gather, share skills and spark inspiration.\n\nWe run social sewing sessions and fabric swap events, share free patterns, and through our [Sewing Machine Repair Programme](/repair-programme) we service donated machines and rehome them with people and groups who will use them.",
    true
  ),
  "about.values.eyebrow": slot("About: values label", "What guides us"),
  "about.values.title": slot("About: values title", "Our values"),
  "about.value1.title": slot("About: value 1 title", "Sustainability"),
  "about.value1.text": slot(
    "About: value 1 text",
    "Promoting zero-waste practices, reuse, repair and mindful use of textile resources.",
    true
  ),
  "about.value2.title": slot("About: value 2 title", "Shared learning"),
  "about.value2.text": slot(
    "About: value 2 text",
    "Welcoming spaces where everyone can learn, teach and grow together, whatever their skill level.",
    true
  ),
  "about.value3.title": slot("About: value 3 title", "Community"),
  "about.value3.text": slot(
    "About: value 3 text",
    "Bringing people together through making, mending and conversation, right here in West Auckland.",
    true
  ),
  "about.where.eyebrow": slot("About: where label", "Where we work"),
  "about.where.title": slot("About: where title", "Rooted in West Auckland"),
  "about.where.body": slot(
    "About: where text",
    `Our events run in West Auckland, and sewing machines from our programme are collected from West Auckland.\n\n${site.orgStatus}`,
    true
  ),
  "about.partners.eyebrow": slot("About: partners label", "Thank you"),
  "about.partners.title": slot("About: partners title", "Partners & supporters"),
  "about.partners.intro": slot(
    "About: partners text",
    "We couldn't do this without the venues, groups and people who support us.",
    true
  ),
  "about.partners.cta": slot(
    "About: partnering note",
    `Interested in partnering with us or supporting the programme? [Get in touch](mailto:${site.email}).`,
    true
  ),

  // Repair programme
  "repair.hero.eyebrow": slot("Repair programme: hero label", "Our programme"),
  "repair.hero.title": slot("Repair programme: hero title", "Sewing Machine Repair Programme"),
  "repair.hero.intro": slot(
    "Repair programme: hero text",
    "We give unused sewing machines a second life. Donated machines are serviced and rehomed with people and community groups who will use them, keeping them out of landfill and putting a valuable skill within reach.",
    true
  ),
  "repair.problem.eyebrow": slot("Repair programme: why label", "Why it matters"),
  "repair.problem.title": slot("Repair programme: why title", "Good machines shouldn't go to waste"),
  "repair.problem.body": slot(
    "Repair programme: why text",
    "Many households have a sewing machine sitting unused in a cupboard, and working machines regularly end up in landfill when they need little more than a service.\n\nAt the same time, a sewing machine is out of reach for many people who want to mend their clothes, learn a skill or make things for their whānau and community.\n\nThe programme connects the two: it reduces waste, extends the life of the textiles people already own through mending, and builds sewing skills in the community.",
    true
  ),
  "repair.steps.eyebrow": slot("Repair programme: steps label", "How it works"),
  "repair.steps.title": slot("Repair programme: steps title", "From cupboard to community"),
  "repair.step1.title": slot("Repair programme: step 1 title", "Donated"),
  "repair.step1.text": slot(
    "Repair programme: step 1 text",
    "People and organisations give us sewing machines they no longer use, instead of storing them or throwing them away.",
    true
  ),
  "repair.step2.title": slot("Repair programme: step 2 title", "Serviced & repaired"),
  "repair.step2.text": slot(
    "Repair programme: step 2 text",
    "Each machine is cleaned, checked and repaired, then logged with its details and photos so we know its history.",
    true
  ),
  "repair.step3.title": slot("Repair programme: step 3 title", "Rehomed"),
  "repair.step3.text": slot(
    "Repair programme: step 3 text",
    "Ready machines are matched with people on our waiting list, in order, and collected from West Auckland.",
    true
  ),
  "repair.recipients.eyebrow": slot("Repair programme: groups label", "Where machines have gone"),
  "repair.recipients.title": slot("Repair programme: groups title", "Sewing machines in the community"),
  "repair.recipients.intro": slot(
    "Repair programme: groups text",
    "As well as individuals, machines from the programme have gone to community organisations including:",
    true
  ),
  "repair.gallery.eyebrow": slot("Repair programme: gallery label", "Rehomed"),
  "repair.gallery.title": slot("Repair programme: gallery title", "Machines with new homes"),
  "repair.who.eyebrow": slot("Repair programme: who label", "Who it helps"),
  "repair.who.title": slot("Repair programme: who title", "Individuals and community groups"),
  "repair.who.body": slot(
    "Repair programme: who text",
    "Anyone can apply, whether for themselves or on behalf of a community group or organisation. Applicants join a waiting list and are matched with machines in the order they applied.\n\nMachines are collected from West Auckland, so we prioritise applicants who live in or near West Auckland.",
    true
  ),
  "repair.goal.eyebrow": slot("Repair programme: goal label", "Our bigger goal"),
  "repair.goal.title": slot("Repair programme: goal title", "Part of a zero-waste Tāmaki Makaurau"),
  "repair.goal.body": slot(
    "Repair programme: goal text",
    `Repairing and rehoming sewing machines, and teaching people to mend, keeps products and textiles in use for longer. This supports Auckland's goal of working towards zero waste by 2040.\n\nWant to support or partner with the programme? Get in touch at [${site.email}](mailto:${site.email}).`,
    true
  ),
  "repair.cta.title": slot("Repair programme: closing title", "Have a machine you no longer use?"),
  "repair.cta.text": slot(
    "Repair programme: closing text",
    "Donate it, and we'll make sure it gets back into a maker's hands.",
    true
  ),

  // Apply for a machine
  "apply.hero.eyebrow": slot("Apply: hero label", "Repair Programme"),
  "apply.hero.title": slot("Apply: hero title", "Apply for a sewing machine"),
  "apply.hero.tagline": slot(
    "Apply: hero text",
    "Local Fibre helps get sewing machines into the hands of people and community groups who will put them to good use.",
    true
  ),
  "apply.info1.title": slot("Apply: card 1 title", "Who can apply"),
  "apply.info1.text": slot(
    "Apply: card 1 text",
    "Anyone from the public is welcome to apply, whether you're an individual or applying on behalf of a community group.",
    true
  ),
  "apply.info2.title": slot("Apply: card 2 title", "West Auckland pickup"),
  "apply.info2.text": slot(
    "Apply: card 2 text",
    "Machines are collected from West Auckland, so we prioritise applicants who live in or near West Auckland.",
    true
  ),
  "apply.info3.title": slot("Apply: card 3 title", "How it works"),
  "apply.info3.text": slot(
    "Apply: card 3 text",
    "Fill in the form below to join the queue. We'll contact you by email or phone when a machine is available for you.",
    true
  ),
  "apply.form.title": slot("Apply: form title", "Apply for a Sewing Machine"),

  // Donate a machine
  "donate.hero.eyebrow": slot("Donate: hero label", "Repair Programme"),
  "donate.hero.title": slot("Donate: hero title", "Donate a sewing machine"),
  "donate.hero.tagline": slot(
    "Donate: hero text",
    "Got a sewing machine or overlocker gathering dust? Working or not, we'll service it and pass it on to someone who'll use it.",
    true
  ),
  "donate.info1.title": slot("Donate: card 1 title", "Working or not"),
  "donate.info1.text": slot(
    "Donate: card 1 text",
    "We repair machines too, so it doesn't matter if yours needs some love. Missing parts are often fine.",
    true
  ),
  "donate.info2.title": slot("Donate: card 2 title", "One or a few"),
  "donate.info2.text": slot(
    "Donate: card 2 text",
    "Clearing out a collection? Put them all in one form and add a photo of each.",
    true
  ),
  "donate.info3.title": slot("Donate: card 3 title", "What happens next"),
  "donate.info3.text": slot(
    "Donate: card 3 text",
    "We'll look at your photos and get in touch to arrange drop-off in West Auckland or collection.",
    true
  ),
  "donate.form.title": slot("Donate: form title", "Offer a machine"),
} satisfies Record<string, TextSlot>

export type TextKey = keyof typeof TEXT_SLOTS

export type SiteText = Record<TextKey, string>

export const isTextKey = (value: string): value is TextKey => value in TEXT_SLOTS

/** Longest text an admin can save in one slot */
export const MAX_TEXT_LENGTH = 4000
