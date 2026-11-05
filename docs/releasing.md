# Releasing `chrome-launcher`

Releases are published automatically to npm via GitHub Actions using [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers) (OIDC provenance) when a version tag (`v*`) is pushed.

## Release Steps

1. **Ensure `main` is up to date and clean:**
   ```sh
   git checkout main
   git pull origin main
   ```

2. **Update `changelog.md`:**
   Add a new section at the top of [`changelog.md`](../changelog.md) for the new version (e.g. `## vX.Y.Z (Day, Mon DD YYYY)`) listing the commits/changes since the previous tag:
   ```sh
   git log $(git describe --tags --abbrev=0)..HEAD --oneline
   ```

3. **Bump the version in `package.json`, commit, and tag:**
   Update `"version"` in [`package.json`](../package.json) to `X.Y.Z`, then commit and tag `vX.Y.Z`:
   ```sh
   git add changelog.md package.json
   git commit -m "X.Y.Z"
   git tag vX.Y.Z
   ```

4. **Push the commit and tag to GitHub:**
   ```sh
   git push origin main vX.Y.Z
   ```

5. **Verify the GitHub Actions workflow:**
   Pushing the `vX.Y.Z` tag triggers the [Publish Package](../.github/workflows/publish.yml) workflow, which:
   - Installs dependencies (`yarn --frozen-lockfile`)
   - Builds (`yarn build`) and runs the test suite (`xvfb-run --auto-servernum yarn test`)
   - Publishes to npm with provenance (`npm publish --provenance --access public`)

   The workflow can also be triggered manually from the GitHub Actions tab via `workflow_dispatch` if needed.
