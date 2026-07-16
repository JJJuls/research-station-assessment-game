# Remote Outpost Assessment

A browser-based psychology research assessment instrument built on a Phaser 3 +
TypeScript + Vite foundation. It is launched from Qualtrics and collects
structured behavioural data. `CLAUDE.md` and `AGENTS.md` govern how work in
this repository is done; participant deployment is governed by
[docs/operations/PARTICIPANT-DEPLOYMENT.md](docs/operations/PARTICIPANT-DEPLOYMENT.md).

## Prerequisites

[nvm](https://github.com/nvm-sh/nvm#installing-and-updating):

```sh
brew install nvm
```

## Install

Clone the repository:

```sh
git clone https://github.com/remarkablegames/phaser-rpg.git
cd phaser-rpg
```

Install the dependencies:

```sh
npm install
```

## Environment Variables

Update the environment variables:

```sh
cp .env .env.local
```

Update the **Secrets** in the repository **Settings**.

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the game in the development mode.

Open [http://localhost:5173](http://localhost:5173) to view it in the browser.

The page will reload if you make edits.

You will also see any errors in the console.

### `npm run build`

Builds the game for production to the `dist` folder (minified, hashed filenames).

**This output is not the participant deployment artifact.** It uses an absolute
`/` base and, outside `BUNDLE=true`, includes development-only shell extras. It
must never be served to participants — see
[docs/operations/PARTICIPANT-DEPLOYMENT.md](docs/operations/PARTICIPANT-DEPLOYMENT.md).

### `npm run bundle`

Builds the participant deployment artifact into the `dist` folder (external
scripts stripped, relative `./` base) and, outside CI, compresses it into a ZIP
archive.

This is the **only** command whose output may be served to participants. The
exact invocation (including `CI=true` on Windows) and the verification
checklist live in
[docs/operations/PARTICIPANT-DEPLOYMENT.md](docs/operations/PARTICIPANT-DEPLOYMENT.md).

## License

[MIT](LICENSE)
