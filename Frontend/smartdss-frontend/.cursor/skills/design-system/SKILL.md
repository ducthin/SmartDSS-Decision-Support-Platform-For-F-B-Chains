---
name: design-system-bean-brew
description: Creates implementation-ready design-system guidance with tokens, component behavior, and accessibility standards. Use when creating or updating UI rules, component specifications, or design-system documentation.
---

<!-- TYPEUI_SH_MANAGED_START -->

# Bean & Brew

## Mission
Deliver implementation-ready design-system guidance for Bean & Brew that can be applied consistently across e-commerce storefront interfaces.

## Brand
- Product/brand: Bean & Brew
- URL: https://coffee-shop-theme.netlify.app/
- Audience: online shoppers and consumers
- Product surface: e-commerce storefront

## Style Foundations
- Visual style: structured, accessible, implementation-first
- Main font style: `font.family.primary=DM Sans`, `font.family.stack=DM Sans, sans-serif`, `font.size.base=16px`, `font.weight.base=400`, `font.lineHeight.base=27.2px`
- Typography scale: `font.size.xs=11.2px`, `font.size.sm=13.12px`, `font.size.md=13.28px`, `font.size.lg=13.33px`, `font.size.xl=13.6px`, `font.size.2xl=14.08px`, `font.size.3xl=14.4px`, `font.size.4xl=14.88px`
- Color palette: `color.text.primary=#1a0e07`, `color.text.secondary=#ffffff`, `color.text.tertiary=#f3e4d0`, `color.text.inverse=#6b5040`, `color.surface.base=#000000`, `color.surface.muted=#fdf7f0`
- Spacing scale: `space.1=4.8px`, `space.2=6.4px`, `space.3=7.2px`, `space.4=8px`, `space.5=9.6px`, `space.6=11.2px`, `space.7=12.8px`, `space.8=13.6px`
- Radius/shadow/motion tokens: `radius.xs=12px`, `radius.sm=16px`, `radius.md=22px`, `radius.lg=28px`, `radius.xl=50px` | `shadow.1=rgba(26, 14, 7, 0.18) 0px 20px 40px -8px` | `motion.duration.instant=350ms`, `motion.duration.fast=400ms`, `motion.duration.normal=900ms`

## Accessibility
- Target: WCAG 2.2 AA
- Keyboard-first interactions required.
- Focus-visible rules required.
- Contrast constraints required.

## Writing Tone
concise, confident, implementation-focused

## Rules: Do
- Use semantic tokens, not raw hex values in component guidance.
- Every component must define required states: default, hover, focus-visible, active, disabled, loading, error.
- Responsive behavior and edge-case handling should be specified for every component family.
- Accessibility acceptance criteria must be testable in implementation.

## Rules: Don't
- Do not allow low-contrast text or hidden focus indicators.
- Do not introduce one-off spacing or typography exceptions.
- Do not use ambiguous labels or non-descriptive actions.

## Guideline Authoring Workflow
1. Restate design intent in one sentence.
2. Define foundations and tokens.
3. Define component anatomy, variants, and interactions.
4. Add accessibility acceptance criteria.
5. Add anti-patterns and migration notes.
6. End with QA checklist.

## Required Output Structure
- Context and goals
- Design tokens and foundations
- Component-level rules (anatomy, variants, states, responsive behavior)
- Accessibility requirements and testable acceptance criteria
- Content and tone standards with examples
- Anti-patterns and prohibited implementations
- QA checklist

## Component Rule Expectations
- Include keyboard, pointer, and touch behavior.
- Include spacing and typography token requirements.
- Include long-content, overflow, and empty-state handling.

## Quality Gates
- Every non-negotiable rule must use "must".
- Every recommendation should use "should".
- Every accessibility rule must be testable in implementation.
- Prefer system consistency over local visual exceptions.

<!-- TYPEUI_SH_MANAGED_END -->
