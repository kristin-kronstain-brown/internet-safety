# internet-safety

A guide to internet safety for parents, published at
<https://kristin-kronstain-brown.github.io/internet-safety/>.

This site is built with [Hugo](https://gohugo.io/) and the
[Docura](https://themes.gohugo.io/themes/docura/) theme.

## Build it locally

Hugo extended is the only requirement. The theme comes in as a Hugo module, so
Go also has to be installed.

```bash
hugo server   # preview at http://localhost:1313/internet-safety/
hugo --gc     # production build into public/
```

CI pins Hugo 0.166.0. The site also builds clean on 0.160.1, so a local
`hugo160` is fine for previewing.

**Open `http://localhost:1313/internet-safety/`, not `http://localhost:1313/`.**
This site is published under a project subpath, so `baseURL` has a path in it
and the server root is empty. Hugo prints the right URL on startup.

To preview a production build rather than the dev server, point `baseURL` at
wherever you are serving it from:

```bash
hugo --gc --baseURL http://localhost:8000/
python3 -m http.server 8000 -d public
```

Serving a `public/` built for GitHub Pages off a plain local web server does
not work, because every path in it is prefixed with `/internet-safety/`.

To pick up theme updates:

```bash
hugo mod get -u github.com/docura/docura
```

## How this repo is laid out

This directory holds a fairly standard Hugo site, with three wrinkles worth
knowing about before you edit anything.

```
content/en/
  _index.md            home page; the theme renders a cover, not this body
  docs/                -> /docs/, "For parents" in the menu
  guide/               -> /guide/, "Age-based guide" in the menu
    ages-4-6/          page bundle, because it ships a word search image
data/en/
  docs/sidebar.yaml    sidebar for the /docs/ section
  guide/sidebar.yaml   sidebar for the /guide/ section
assets/
  css/games.css        styling and print rules for the game blocks
  js/game-print.js     injects the print buttons on games, cards, and keys
layouts/               local overrides of theme templates, see below
static/manifest.json   shadows the theme's copy
```

### Wrinkle 1: the sidebar is driven by data files, not front matter

Docura does not read `weight` or any parent-child relationship out of page
front matter. Each section's navigation comes from
`data/en/<section>/sidebar.yaml`, and each link is built as
`/<section>/<title | urlize>/`.

That means **the title in the sidebar file has to match the page's filename**.
"Red flags" produces `red-flags`, so the page must be `red-flags.md`. Adding a
page is a two-step job: create the markdown file, then add a matching entry to
the sidebar file. A page with no sidebar entry still builds and is still
reachable by URL, it just never appears in the navigation.

One gotcha: `urlize` drops en dashes instead of replacing them, so `Ages 4–6`
becomes `ages-46`. Use plain hyphens in the sidebar file.

Each section's first page carries an `aliases` entry (`/docs/`, `/guide/`) so
the menu links land somewhere. Docura ships no list template, so
`disableKinds` in `hugo.yaml` turns section and taxonomy pages off rather than
letting them render blank.

### Wrinkle 2: printable games are markdown inside a div

Every lesson in `content/en/guide/` ends with a printable game. A game is
authored as markdown wrapped in a plain `div`:

```markdown
<div class="game game-cards">

### Game: Tap or ask?

**Players:** 2 · **Time:** 10 minutes · **You need:** scissors

Instructions go here.

| | |
|---|---|
| Card text | Card text |

</div>
```

**The blank line after `<div ...>` is required.** It closes the HTML block so
Goldmark parses what follows as markdown. Without it, the whole game renders as
literal text.

Three wrapper classes do the work, all in `assets/css/games.css`:

- `game-cards` renders a markdown table as dashed cut-out cards.
- `game-grid` renders one as a bingo-style grid of squares.
- `card-sheet`, nested inside a game, marks a block that gets a printed page to
  itself. The bingo game uses one per card, so three players each get their own
  sheet rather than sharing one page.

Both hide the table's header row, so leave it empty (`| | |`). Markdown
requires a header row to exist; it just does not have to say anything.

**Answer keys go outside the game block, never inside it:**

```markdown
</div>

<div class="answers">

<details>
<summary>Answer key</summary>

The answers go here.

</details>

</div>
```

That separation is the whole mechanism. `@media print` hides `.answers`
outright, so a game printed for a kid cannot carry its own answers, and a
whole-page print does not either.

`assets/js/game-print.js` adds a **Print this game** button to each game, a
**Print this card** button to each `card-sheet`, and a **Print answer key**
button to each answer block, so the markdown files hold nothing but content.
Any of them prints that one block on its own sheet.

Printing a nested block works by marking the target `printing` and every
ancestor up to `#article-content` `print-keep-open`, then hiding the other
children at each level. That is what lets a single bingo card print out of the
middle of a game. Printing an answer key also opens its collapsed `details`
first, then restores it.

Because print hides answer keys by default, the **Print answer key** button is
the only way to get one onto paper. That is deliberate, but it does mean a
plain Ctrl+P of a lesson gives you the games without the keys.

### Wrinkle 3: the theme assumes it is served from the domain root

Docura hardcodes several paths as absolute from `/`. This site is a GitHub
Pages *project* site published under `/internet-safety/`, so those paths all
404. The files in `layouts/` are copies of the theme's templates with that
fixed, plus a couple of smaller changes. Each one carries a comment at the top
explaining what was changed and why.

| Override | Why |
| --- | --- |
| `layouts/partials/sidebar.html` | Sidebar links were absolute from `/` |
| `layouts/partials/article-footer.html` | Prev and next links were absolute from `/` |
| `layouts/partials/site-header.html` | Brand link was absolute from `/`; also drops the language dropdown, which has nothing to switch to |
| `layouts/partials/favicons.html` | Manifest and icon paths were absolute from `/` |
| `layouts/partials/scripts.html` | Drops the service worker registration, which fails to install anyway; adds `game-print.js` |
| `layouts/_default/baseof.html` | `.Site.LanguageCode` is deprecated and slated for removal |
| `layouts/_default/single.html` | `.Site.Data` is deprecated and slated for removal |
| `static/manifest.json` | Theme copy points icons at `/img/icon/`, and names the app "Docura" |
| `layouts/partials/stylesheets.html` | Adds `assets/css/games.css` to the docs bundle |
| `layouts/alias.html` | Hugo's built-in alias redirects to an absolute URL, so a production build opened locally jumps to the live site |

Note that `relURL` and `relLangURL` return a path unchanged if it already
starts with `/`. The overrides pass paths without a leading slash for that
reason.

Re-check these overrides after a theme update. Nothing warns you when an
upstream template changes underneath a local copy.

## Deploying

`.github/workflows/hugo-gh-pages.yml` builds and deploys on every push to
`main`. It checks out with `fetch-depth: 0` because `enableGitInfo` reads each
page's last commit date for the "Last updated" line in the footer.
