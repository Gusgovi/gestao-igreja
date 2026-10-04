---
name: church-management-project
description: Product and domain guidance for the church management web application. Use this skill whenever implementing, modifying, planning, reviewing, or making product decisions for this project.
---

# Church Management Project

## Purpose

This project is a web-based church management system designed to simplify
the organization of church members, ministries, schedules, rehearsals,
songs, and canteen activities.

The system is being developed initially as a functional academic MVP,
but it should be structured so that it can later become a real system
used by the church.

The application must prioritize:

1. Simplicity
2. Reliability
3. Ease of use
4. Clear information hierarchy
5. Fast development
6. Maintainable code
7. Future extensibility without premature complexity

The immediate priority is delivering a stable and demonstrable MVP.

---

# Technology Stack

The technology stack for this project is intentionally simple.

Frontend:

- HTML5
- CSS3
- Vanilla JavaScript

Backend services:

- Supabase
- Supabase Database
- Supabase Authentication
- Supabase Row Level Security when appropriate

Do not migrate the project to React, Vue, Angular, Next.js, Flutter,
TypeScript, or another frontend framework unless explicitly requested.

Prefer standard browser APIs and simple JavaScript modules.

The code should remain understandable and maintainable by a developer
familiar with HTML, CSS, and JavaScript.

Avoid adding libraries, frameworks, build systems, or dependencies when
the same requirement can reasonably be implemented using the existing
stack.

When an additional dependency is genuinely useful, explain its purpose
before introducing a significant new dependency.

Do not introduce a custom backend server unless a requirement genuinely
requires one.

Use Supabase for backend capabilities whenever it appropriately solves
the requirement.

Never expose privileged Supabase credentials, service-role keys, or
other secrets in frontend JavaScript.

---

# Code Organization

Vanilla JavaScript does not mean placing all application logic inside
one large script file.

Keep the project organized using clear responsibilities.

Prefer separating concerns such as:

- Supabase configuration
- Authentication
- Members
- Schedules
- Worship
- Rehearsals
- Canteen
- Shared UI behavior

Avoid unnecessarily large JavaScript files.

Reuse shared logic instead of duplicating the same code across pages.

CSS should also remain organized and reusable.

Prefer shared styles and reusable components/patterns instead of
duplicating page-specific CSS unnecessarily.

Do not restructure working code only to match an ideal folder structure.

Improve organization incrementally when there is a concrete benefit.

---

# Target Users

Users may have very different levels of technological familiarity.

Assume that some users:

- are not technically experienced;
- primarily use smartphones;
- may be older adults;
- should not need training to understand basic actions.

Therefore:

- prefer obvious actions over hidden interactions;
- use clear Brazilian Portuguese labels;
- avoid technical terminology in the interface;
- avoid unnecessarily complex navigation;
- provide confirmation and feedback after important actions;
- make important information easy to scan;
- keep forms as short and understandable as possible.

The interface language should be Brazilian Portuguese.

---

# MVP Scope

The MVP focuses on the following areas.

## Members

Allow authorized users to:

- view members;
- register members;
- edit basic member information;
- use members when assigning ministry schedules.

Do not turn this into a complete church CRM during the MVP.

---

## Schedules

The system should support ministry and service schedules.

Initial examples include:

- Worship ministry
- Canteen

A schedule should clearly communicate:

- date;
- ministry or service;
- assigned people;
- role or responsibility when applicable.

The system should make it easy to answer:

"Who is serving, where, and when?"

Prefer reusable scheduling concepts instead of creating completely
independent implementations for every ministry.

---

## Worship Ministry

The worship area should support:

- songs;
- rehearsal information;
- worship schedules;
- people participating in the schedule.

Keep song management practical for ministry organization.

Do not build advanced music streaming, audio hosting, chord editors,
or similar features unless explicitly requested.

---

## Rehearsals

Rehearsals should allow users to understand:

- rehearsal date and time;
- relevant ministry;
- participants when applicable;
- songs or relevant information for the rehearsal.

Keep the workflow simple.

---

## Canteen

The canteen area should support:

- schedules;
- people responsible for serving;
- items or products;
- prices.

The initial goal is organization, not building a complete restaurant,
inventory, accounting, or point-of-sale platform.

Do not introduce financial complexity unless explicitly requested.

---

# Roles and Permissions

Keep authorization simple during the MVP.

Prefer a small number of understandable roles rather than creating
a complex permission matrix.

At minimum, distinguish between:

- users who can view relevant information;
- administrators or authorized users who can manage information.

Security must be enforced at the backend/database level.

Do not rely exclusively on hiding buttons or pages in the frontend
for authorization.

Use Supabase authentication and database security policies appropriately.

---

# Product Decision Rules

When multiple implementations are possible, prioritize in this order:

1. Works reliably for the demonstration.
2. Is easy for church members to understand.
3. Protects user and church data appropriately.
4. Can be implemented and tested quickly.
5. Is maintainable.
6. Can be extended later.

Avoid overengineering.

Do not introduce:

- microservices;
- unnecessary abstraction layers;
- frontend frameworks without explicit approval;
- complex state management without a demonstrated need;
- speculative features;
- premature optimization;
- elaborate enterprise architecture;
- unnecessary external services.

A simple implementation that correctly solves the current problem is
preferred over a sophisticated implementation designed for hypothetical
future requirements.

---

# Scope Control

Before adding functionality, determine whether it belongs to the current
MVP.

If a requested improvement is useful but not necessary for the current
delivery, prefer documenting it as a future improvement instead of
expanding the implementation automatically.

Do not silently expand the scope.

When uncertain whether a feature belongs in the MVP, ask or clearly
identify the tradeoff before implementing significant additional work.

The immediate objective is not to create every feature a church
management platform could theoretically have.

The objective is to create a coherent, reliable, presentable MVP.

---

# Existing Code

The project may already contain working implementation.

Before making changes:

1. Inspect the existing project.
2. Understand the current architecture and conventions.
3. Identify what already works.
4. Reuse working components and patterns when reasonable.
5. Avoid rewriting functional code without a concrete benefit.
6. Make incremental changes whenever possible.

Do not restart or substantially restructure the project simply because
another architecture would be theoretically cleaner.

Do not migrate working HTML, CSS, and JavaScript to another framework
without explicit approval.

---

# Database

The database should represent the church domain clearly.

Prefer:

- understandable table names;
- explicit relationships;
- proper foreign keys;
- appropriate constraints;
- migrations or documented schema changes;
- backend authorization policies.

Avoid duplicating information unnecessarily.

When modifying the database, consider whether existing data or features
could be affected.

Never perform destructive schema changes casually.

Use the project's Supabase-specific skill or guidance when making
Supabase architecture, authentication, security, database, or RLS
decisions.

Never place privileged database credentials in frontend code.

---

# UI and UX

The interface should feel like one coherent application.

Reuse:

- typography;
- spacing;
- buttons;
- cards;
- forms;
- dialogs;
- navigation patterns;
- feedback patterns.

Every important screen should consider:

- loading state;
- empty state;
- error state;
- success feedback.

Follow the project's web design and accessibility guidelines when
implementing or reviewing interfaces.

The application should be responsive.

Mobile usability is important.

The desktop interface should also remain clean and practical for
administrative use.

Prefer clarity over visual complexity.

Animations and decorative effects should never interfere with usability
or consume significant development effort during the MVP.

---

# Accessibility

Accessibility should be considered during implementation rather than
being treated only as a final review step.

Prefer:

- semantic HTML;
- properly associated form labels;
- keyboard-accessible controls;
- visible focus states;
- readable text sizes;
- adequate contrast;
- descriptive buttons and actions;
- understandable validation messages.

Use the project's web design and accessibility skill for detailed
interface reviews.

---

# Supabase

Supabase is the primary backend platform for this project.

Use it appropriately for:

- authentication;
- relational data;
- database persistence;
- authorization policies;
- other backend capabilities when justified.

Frontend code may use the public Supabase configuration intended for
browser clients.

Privileged keys and administrative secrets must never be exposed in
client-side JavaScript.

Use Row Level Security when necessary to protect application data.

Do not disable security mechanisms merely to make a feature easier to
implement.

At the same time, avoid designing an unnecessarily complex permission
system for the MVP.

Use the project's Supabase skill as the specialized authority for
Supabase-specific implementation details.

---

# Quality and Demonstration Readiness

For every major feature, verify the complete user flow rather than only
checking whether the page renders.

Critical flows should be tested before presentation.

Examples include:

- user authentication;
- entering and leaving authenticated sessions;
- viewing members;
- registering a member;
- editing a member;
- creating or editing a schedule;
- assigning members to schedules;
- viewing worship information;
- managing songs;
- viewing rehearsal information;
- managing canteen information.

Verify that data persists correctly in Supabase where applicable.

Test common failure scenarios when practical.

Prefer fixing bugs and incomplete flows over adding optional features.

A smaller application where every demonstrated flow works is preferable
to a larger application containing unfinished features.

---

# Development Behavior

Work autonomously when requirements are clear.

Do not ask for confirmation for trivial implementation details.

Do not stop development repeatedly for minor decisions that can be
reasonably inferred from the existing project and these guidelines.

Ask before:

- significantly changing product scope;
- performing destructive database operations;
- replacing major working architecture;
- changing the established technology stack;
- introducing paid external services;
- adding major dependencies;
- making a product decision with important consequences that is not
  established by the project requirements.

When completing substantial work, explain briefly:

- what was implemented;
- important architectural decisions;
- database changes;
- remaining limitations or TODOs;
- what should be tested next.

---

# Working With Other Skills

This skill defines the product requirements, domain, scope, technology
constraints, and development priorities.

When specialized guidance is needed:

- use the web design skill for interface, UX, accessibility, and visual
  quality;
- use the Supabase skill for database, authentication, RLS, and Supabase
  implementation;
- use the software architecture skill for architecture decisions when
  architectural analysis is genuinely necessary.

Specialized skills should operate within the product constraints defined
here.

Do not allow a specialized skill to unnecessarily expand the scope,
replace the established stack, or introduce complexity that conflicts
with the MVP priorities.

---

# Definition of Done

A feature is not complete merely because code was generated or because
a page renders.

A feature is complete when:

- its main user flow works;
- data persists correctly when applicable;
- authorization is respected;
- common error states are handled;
- the UI communicates success or failure;
- the implementation integrates with the rest of the application;
- it works appropriately on desktop and mobile;
- it does not obviously break existing functionality;
- the implementation remains understandable within the established
  HTML, CSS, JavaScript, and Supabase stack.

The goal is a small, coherent, reliable product — not the largest
possible feature set.