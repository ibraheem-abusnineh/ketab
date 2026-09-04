# Ketab Domain Glossary

A glossary of the domain terms used across the Ketab platform. It records what each concept is and which near-synonyms to avoid, so that the codebase, the docs, and the conversation all name the same thing the same way.

## Visitors and Sessions

**Visitor**:
A person who loads a worksheet page. May or may not be logged in.
_Avoid_: user (overloaded), guest (overloaded)

**Session**:
A login event by a known user (parent, teacher, supervisor, student, qra-employ, developer). Bounded by login and logout.
_Avoid_: visit (means page-load, not login)

**PageView**:
A single worksheet page-load by a visitor. Increments the `pageViews` counter on the current calendar day in Asia/Amman. Distinct from a session.
_Avoid_: hit (web-analytics term, not used in the codebase), session (means a login event)

**LoginHistory**:
A per-user, per-day aggregate record. Shape: `{nationalNumber, name, school, date, loginCount, pageViews, lastSeenAt}`. One entry per (user, day) pair. Replaces an earlier append-only array of per-login events.
_Avoid_: login event (one row of the new aggregate), visit (means pageView)

## Profile Changes

**ProfileEditRequest**:
A pending change to a user's profile fields, raised by the user and approved or rejected by an admin. Lives in `notifications` with `type: 'profile_edit_request'` and `status: 'pending' | 'approved' | 'rejected'`.
_Avoid_: profile update (means an admin-direct edit, no approval), notification (overloaded; some notifications are not requests)

**ProfileUpdate**:
An admin-direct edit to a user's profile fields. Recorded in `notifications` with `type: 'profile_update'` for audit. No approval step.
_Avoid_: profile edit (means the user-raised request, not the admin write)

**Notification**:
A row in `notifications.json` covering both `profile_edit_request` and `profile_update` types.
_Avoid_: request (only one type is a request), alert (UI term, not in the data)

## Courses

**CourseLock**:
A per-course (`arabic`, `english`) boolean. When true, the course is hidden from non-admin visitors. Stored in `courses.json` (local-only, never remote-synced).
_Avoid_: course state (state is a UI concept; lock is the persisted boolean), feature flag (broader concept, not what is stored)

## Persistence

**DualWrite**:
A persistence operation that writes to a local JSON file and, when configured, also to the GitHub Contents API. The local file is the source of truth at runtime; the remote is a backup that survives container restart. The contract: local write first, then remote write best-effort, with the result surfaced to the caller as `{ok, source, error?}`.
_Avoid_: S3 write (the remote is GitHub, not S3 — the old name was misleading), sync (sync is the boot-time pull, not the write-time push)

**BootSync**:
The startup pull from the GitHub Contents API into local JSON files. Runs once per process, before the HTTP listener starts. Mirrors `users.json`, `visits.json`, `notifications.json` from remote; seeds the remote with defaults if the remote is missing.
_Avoid_: syncFromS3 (the old function name; the new name is the contract, not the implementation), init (too generic)

## Reads and Reports

**Aggregator**:
The read-side reductions over `loginHistory`: bySchool, byTime, userHistory, byUser. One module, one function per reduction. Both stats and reports import from it.
_Avoid_: stats helper (the reductions are reused by reports, not just stats), calculator (the reductions are read-time, not compute)

## Authorization

**Actor**:
A requester of an admin or developer action. Identified by an authorization token. Two actor roles: **Admin** (token prefix `admin_`, issued after a bcrypt verify) and **Developer** (token prefix `dev_`, issued after a `DEV_PASSWORD` verify). An Admin token satisfies `requireAuth` and `requireAdmin`. A Developer token satisfies `requireAuth` and `requireDev`. A Developer token also satisfies `requireAdmin`: the developer role is a superset of the admin role for the purpose of unblocking stuck admin operations.
_Avoid_: user (the visitor concept), operator (not used in the codebase), caller (generic; the term here names a specific kind of requester)

**DevNamespace**:
The `routes/dev.js` module, mounted at `/api/dev/*`. Gated by `requireDev`. Used by the Developer actor to inspect data and fix errors.
_Avoid_: /dev route (the old code has no such path; the dev surface is the token plus the namespace, not a single URL)

**RequireAuth**:
Middleware that admits any valid Actor token. Used for routes that any logged-in admin or developer can call.
_Avoid_: logged in (a Visitor is also a logged-in user; the distinction is admin vs developer vs visitor)

**RequireAdmin**:
Middleware that admits only Admin tokens (or Developer tokens, per the superset policy). Used for admin-only routes.
_Avoid_: admin auth (generic; the seam name is specific to the policy)

**RequireDev**:
Middleware that admits only Developer tokens. Used for the dev namespace only.
_Avoid_: developer auth (the policy is dev-only, not the auth flow)

## People and Identifiers

**PhoneDigits**:
The canonical 10-digit phone number, validated by `/^\d{10}$/`.
_Avoid_: phone number (the format constraint is part of the term; "phone" alone is the raw input), nationalNumber (that is a different identifier, not a phone)

**NationalNumber**:
The unique identifier for a User (parent, teacher, etc.). Distinct from a phone number.
_Avoid_: ID (overloaded; admin IDs and notification IDs are different), user ID (redundant with the role)

**School**:
A string field on a User, free-form. Distinct from a Directorate (the parent organization).
_Avoid_: institution (broader), organization (used for the qra-employ role)

**Directorate**:
The parent organization of a School. Free-form string.
_Avoid_: region (not necessarily geographic), governorate (a specific kind of directorate, not all)

**User**:
A person with a NationalNumber and a Role. Distinct from a Visitor (who may not be a User). Roles: parent, teacher, supervisor, student, qra-employ, developer.
_Avoid_: account (UI term), profile (a sub-record of a user), member (not used in the codebase)

**Role**:
One of `{parent, teacher, supervisor, student, qra-employ, developer}`. Determines the fields a CSV import expects and the dashboard tabs the user can see.
_Avoid_: user type (the term in the codebase is "role"), permission (an authorization concept, not a domain one)
