# 02_CURRENT_WORKFLOW - AI Routing Rules

Use this file as project-level routing instructions.

## Hard Triggers

Only two hard triggers exist: `Goal` and `diff`.

## Goal

If the user gives a clear objective, enter `Goal` mode.

Do not require words like "start", "continue", or "execute".
Do not ask for step-by-step approval.
Do not pause unless a High-Risk Exception applies.

Run:

```text
read entry docs -> classify task -> trigger skills -> plan steps -> execute -> verify -> update required docs -> report
```

## diff

If `diff` is the user intent or a standalone suffix, enter `diff` mode.

Do not edit files in `diff` mode.
Return proposed changes only.
Use patch-style diffs when useful.

Run:

```text
classify task -> trigger planning skills -> propose diff -> report
```

## Skill Routing

Always trigger matching skills when available:

| Intent | Skills |
|---|---|
| Any clear `Goal` | `using-superpowers`, `ywh-game`, `ywh-web-game` |
| Implement code, UI, or rules | `executing-plans`, `test-driven-development`, `verification-before-completion`, `ywh-game` |
| Bug, anomaly, failed test, failed acceptance | `systematic-debugging`, `test-driven-development`, `verification-before-completion` |
| Existing plan, task card, executable GDD | `executing-plans`, `subagent-driven-development`, `verification-before-completion` |
| Unclear goal, exploration, standalone `diff` | `brainstorming`, `writing-plans`, `ywh-game` |
| Numbers, rules, levels, systems | `brainstorming`, `writing-plans`, `balance-check`, `ywh-game` |
| Browser UI, H5, Canvas, E2E | `ywh-web-game`, `playwright`, `game-playtest`, `verification-before-completion` |
| Docs, CHANGELOG, workflow rules | `ywh-game`, `verification-before-completion` |
| Finish or pre-commit check | `verification-before-completion`, `finishing-a-development-branch`, `ywh-game` |
| Read-only review or workflow audit | `ywh-game` |

## Missing Skills

If a matching skill is unavailable, write `UNAVAILABLE`.
Do not pretend the skill was used.
Continue with this file's rules.
Do not edit another tool's skill directory.

## High-Risk Exceptions

Ask the user before:

- deleting or overwriting many files
- changing core design direction
- proceeding through a clear conflict between the latest user instruction and project docs
- using accounts, secrets, payment, or external authorization
- choosing between options with major long-term impact
- expanding scope after tests fail
