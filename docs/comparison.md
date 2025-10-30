| quality | CLI+Viceroy | Squigil's House |
|--|--|--|
| time overhead to run updated code | a few seconds, I can handle it. the js sdk doesn't do much compilation. there's only wizer and whatever viceroy's startup delay is | feels like less than a second. note that I've only tried editing and viewing in the same region |
| where development happens | on a certain computer. may be a remote computer that you connect to from multiple computers, possibly with a subscription fee | any computer, in web browser. have to log in though |
| auto rebuild | available with `--watch`. restarts when files referenced in `[local_server]` change too. ironically I didn't know about this while bootstrapping this project. starter had non-watch "start" script provided, so I never looked at the manual 😆 | more or less equivalent to auto save in editor |
| state across rebuilds | reinitialized to `[local_server]` spec. this behavior can be helpful in some use cases | persists. this behavior can be helpful in other use cases |
| language support | any sdk's wasm output | js only. theoretically possible to extend to other languages that have wasm interpreter |
| js feature support | starlingmonkey/spider monkey, wintertc stuff | same, but imports are broken. need app rebuild to export new modules in the future |
| dev env separation | local server is intrinsically separate from production site | 😎 |
| backup+version control | it's just files, easy to use git or other tools | dragging around folders to make copies lol |
