---
inclusion: always
---

# Fuego Fridays Workshop

This is a starter template for the Fuego Fridays workshop by AWS Applied AI Solutions.

## What This Project Is
A front-end React app for building humorphic AI teammate interactions. There is no backend. There is no real AI model. The goal is to build the UI/UX for how an AI teammate collaborates with a human.

## The Challenge
The attendee picked one interaction pattern from humorphism.com/foundations and is building it for their own work domain.

## Humorphism Foundations
- Notice: Detect what isn't being tracked yet
- Align: Establish shared direction and understanding
- Delegate: Route work to whoever can do it best
- Execute: Carry out the work
- Decide: Weigh options and formalize a choice
- Communicate: Synthesize and tailor information for the moment
- Coach: Correct, teach, and give feedback in the flow of work
- Verify: Confirm understanding before acting on it
- Consent: Gate action behind informed human agreement
- Escalate: Raise something when it can't be resolved in place

## Key Principle
AI collaboration, not AI tooling. The interface should feel like working with a teammate — not operating a tool. The AI notices, initiates, shows its work, and adapts. It doesn't wait for a prompt.

## What's in the project
- shadcn/ui components in `src/components/ui` — button, card, dialog, input,
  avatar, badge, scroll-area, tooltip, separator, popover
- shadcn/ui chat kit in `src/components/ui` — message, message-scroller,
  bubble, marker, attachment (compose these for any chat/agent surface)
- Mock data in `src/data` — tasks, messages, documents, calendar
- `src/App.tsx` is a plain landing screen; replace it with the build
- Add any other shadcn component live with `npx shadcn@latest add <name>`

These are the stock shadcn components, unmodified. Creating custom components is
fine, but prefer the shadcn/ui primitives where they fit, especially the chat kit
(message, message-scroller, bubble, attachment, marker) for any chat or agent
surface, rather than rebuilding those from scratch. Framer Motion is installed if
motion is wanted.

## Tech Stack
React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui (new-york), Framer Motion

## Rules
- No backend required — mock/simulate AI responses
- Front-end only — the UX IS the deliverable
- Use setTimeout, mock data, or hardcoded sequences to simulate AI behavior
- Focus on the interaction pattern, not on making a real AI work
- The build gets pushed to the attendee's GitHub fork when done
