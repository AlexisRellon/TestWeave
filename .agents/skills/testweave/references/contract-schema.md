# TestWeave contract schema

`test-truth.md` contains exactly one top-level fenced `json testweave` block. That JSON is authoritative; surrounding Markdown is preserved by contract updates.

## Contract and policy

- `schemaVersion`: 2 for new contracts. V1 remains readable; `doctor --fix` migrates it under the contract lock, preserving prose and definitions.
- `project`: nonempty display name.
- `policy.mode`: `block` or `warn`.
- `policy.sourceGlobs`: 1–100 positive workspace-relative POSIX globs covering behavior-bearing files.
- `policy.ignoreGlobs`: up to 100 exclusion globs.
- `modules`: up to 10,000 modules; an initial baseline may be empty.
- Optional `docs`: up to 100 permanent workspace-relative document pointers, optionally with `#heading-slug`.
- Optional `policy.docDriftMode`: `warn` (default), `block`, or `ignore`; independent of source drift policy.

Paths cannot be absolute, negated, contain backslashes, colons, parent traversal, newlines or nulls. Use forward slashes on Windows. Put exclusions in policy rather than negating module paths. Each pattern is 1–500 characters.

## Modules and tests

A module requires `id`, `name`, `description`, `paths` and `tests`. Module IDs are unique. A module has 1–100 paths and 1–1,000 tests.

Optional module `docs` and `specs` contain up to 100 document pointers each. These are separate from source `paths`. Do not duplicate spec prose or link ephemeral `docs/superpowers/plans/` files. Anchors use lowercase heading text, punctuation removal and hyphens; duplicates get `-1`, `-2`. Doctor flags missing documents/anchors. Optional test `refs` contains up to 100 issue IDs or document references.

A test requires `id`, `title`, `priority` and `steps`. Omitted `preconditions` and `tags` default to empty arrays for compact wire mode. Test IDs are globally unique across modules. IDs start with an ASCII letter or digit, contain only letters, digits, dots, underscores or hyphens, and are at most 100 characters.

- `type`: unit, integration, system, sanity, smoke, regression, uat, ui, api, interface, component, e2e, accessibility, security, performance or compatibility. Omitted types default to regression; `testType` is accepted as an alias when type is absent.
- `priority`: low, medium, high or critical.
- `preconditions`: up to 100 nonempty strings.
- `steps`: 1–500 objects containing nonempty `action` and `expected`, plus `data` (which may be empty).
- `tags`: up to 100 nonempty labels, each at most 100 characters.

Names, descriptions, titles, preconditions, actions and expected results are trimmed nonempty strings up to 20,000 characters. Step data is up to 20,000 characters. Unknown object fields are rejected. Use `[]` for absent preconditions or tags.

## Example

~~~json testweave
{
  "schemaVersion": 2,
  "project": "Example",
  "policy": {
    "mode": "block",
    "sourceGlobs": ["src/**/*.ts"],
    "ignoreGlobs": ["**/*.d.ts"]
  },
  "modules": [
    {
      "id": "authentication",
      "name": "Authentication",
      "description": "Registered users start authenticated sessions.",
      "paths": ["src/auth/**"],
      "tests": [
        {
          "id": "AUTH-001",
          "title": "Registered user signs in",
          "type": "smoke",
          "priority": "high",
          "preconditions": ["A verified test account exists"],
          "steps": [
            {
              "action": "Submit the test account credentials on the sign-in form",
              "data": "Valid fixture email and password",
              "expected": "The dashboard appears with an active session"
            }
          ],
          "tags": ["auth", "success"]
        }
      ]
    }
  ]
}
~~~

Preserve established IDs. An upsert replaces the complete module; include every test to retain. Add failure and boundary cases for this example using [functional testing guidance](functional-testing.md). Tests describe acceptance criteria and do not imply they have been executed.

## V2 profiles, fixtures and includes

Optional test `profile` describes manual non-functional checks: `wcagTarget` (string), `keyboard`, `screenReader`, `session`, `inputBoundaries`, `checklist` (string arrays), `authzMatrix` (`{role, resource, access: "allow" | "deny"}[]`), `viewports` (`{width, height}[]`, positive integers), `network` (string), and `budgets` (`{metric, limit, unit}[]`, nonnegative limits). These describe acceptance targets, never measured results or execution statuses.

Top-level `fixtures` maps stable identifiers to reusable nonempty strings, for example `{"standardUser":"A verified test account"}`. Reference them in preconditions or step action/data/expected using `{{fixture.standardUser}}`. Export expands references recursively; storage retains tokens. Missing references and cycles fail doctor/export. Fixtures are local authored data: do not store real credentials.

Top-level `includes` lists explicit descendant contracts, for example `["packages/billing/test-truth.md"]`. Each child is a complete contract. Its source paths, docs/specs and Markdown test refs are relative to its own directory. Root policy governs the compiled workspace. Queries, exports and revision-aware drift compile all included modules. Mutations update the owning document under locks without flattening it into the root. IDs and fixture names must be globally unique. Missing/repeated includes, symlink escapes and more than 100 documents fail validation. A child module's paths must stay within its package when updated from the root. Child policies do not override root policy.
