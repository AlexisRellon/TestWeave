# TestWeave contract schema

`test-truth.md` contains exactly one top-level fenced `json testweave` block. That JSON is authoritative; surrounding Markdown is preserved by contract updates.

## Contract and policy

- `schemaVersion`: 1.
- `project`: nonempty display name.
- `policy.mode`: `block` or `warn`.
- `policy.sourceGlobs`: 1–100 positive workspace-relative POSIX globs covering behavior-bearing files.
- `policy.ignoreGlobs`: up to 100 exclusion globs.
- `modules`: up to 10,000 modules; an initial baseline may be empty.

Paths cannot be absolute, negated, contain backslashes, colons, parent traversal, newlines or nulls. Use forward slashes on Windows. Put exclusions in policy rather than negating module paths. Each pattern is 1–500 characters.

## Modules and tests

A module requires `id`, `name`, `description`, `paths` and `tests`. Module IDs are unique. A module has 1–100 paths and 1–1,000 tests.

A test requires `id`, `title`, `priority`, `preconditions`, `steps` and `tags`. Test IDs are globally unique across modules. IDs start with an ASCII letter or digit, contain only letters, digits, dots, underscores or hyphens, and are at most 100 characters.

- `type`: unit, integration, system, sanity, smoke, regression, uat, ui, api, interface, component or e2e. Omitted types default to regression; `testType` is accepted as an alias when type is absent.
- `priority`: low, medium, high or critical.
- `preconditions`: up to 100 nonempty strings.
- `steps`: 1–500 objects containing nonempty `action` and `expected`, plus `data` (which may be empty).
- `tags`: up to 100 nonempty labels, each at most 100 characters.

Names, descriptions, titles, preconditions, actions and expected results are trimmed nonempty strings up to 20,000 characters. Step data is up to 20,000 characters. Unknown object fields are rejected. Use `[]` for absent preconditions or tags.

## Example

~~~json testweave
{
  "schemaVersion": 1,
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
