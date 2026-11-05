# Workflows

## Zizmor

Every PR that touches `.github/workflows/` is scanned by [Zizmor](https://docs.zizmor.sh/), a static analyzer for GitHub Actions, via [`github_actions_scan.yml`](https://github.com/google-gh-automation/workflows/blob/main/.github/workflows/github_actions_scan.yml). Fix or suppress what it reports.

Run it locally at the [same version](https://github.com/google-gh-automation/workflows/blob/main/.github/workflows/github_actions_scan.yml#L21) (the check also applies an org-managed config, so results can differ slightly):

```sh
uvx zizmor@1.25.2 --gh-token="$(gh auth token)" .github/workflows
```

Add `--fix=all` to apply auto-fixes, but review the diff: some fixes (e.g. `persist-credentials: false`) can break steps that rely on the old behavior. Add `--persona=pedantic` to see the low-confidence findings too.

### Pinning actions

Every `uses:` must be pinned to a full commit SHA, with the tag as a trailing comment:

```yaml
- uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
```

Tags are mutable, so an upstream compromise could repoint one at malicious code. A SHA can't change. `zizmor --fix=all` converts bare tags to this form.

### Suppressing a finding

Put `# zizmor: ignore[<rule>] <reason>` on a line inside the flagged span (or the line immediately above it, if the span starts at a key like `pull_request_target:`). A comment above a `- uses:` list item doesn't count, so put it on that step's `with:` line instead.
