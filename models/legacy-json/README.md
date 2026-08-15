# Legacy JSON-file models (Module 2)

This folder preserves the original Module 2 data-access implementation — the version of
`userModel.js` and `blogModel.js` that read and wrote `server/data/users.json` and
`server/data/blogs.json` directly, via `server/utils/jsonStore.js`.

As of Module 3, the **active** `server/models/userModel.js` and `server/models/blogModel.js`
talk to MongoDB instead (see `server/config/db.js` and `server/models/schemas/`). These files
are kept here — unused by the running app — purely as a safety net and a reference, per the
Module 3 instructions not to delete the JSON storage until MongoDB has been verified working.

`server/data/users.json`, `server/data/blogs.json`, and `server/utils/jsonStore.js` are also
still present and untouched for the same reason.

Once you've confirmed the MongoDB-backed API works end to end (see README.md → Testing), it's
safe to delete this `legacy-json/` folder, `server/data/`, and `server/utils/jsonStore.js` if
you no longer need them.
