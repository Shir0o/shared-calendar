# Changelog

## [1.0.1](https://github.com/Shir0o/shared-calendar/compare/v1.0.0...v1.0.1) (2026-11-12)


### Bug Fixes

* **ci:** pin googleapis/release-please-action SHA (alert [#1](https://github.com/Shir0o/shared-calendar/issues/1)) ([#66](https://github.com/Shir0o/shared-calendar/issues/66)) ([a388a48](https://github.com/Shir0o/shared-calendar/commit/a388a48c1b0ba6e783b46ef3fb9ac05082826647))

## 1.0.0 (2026-11-11)


### Features

* add undo for event mutations ([560809d](https://github.com/Shir0o/shared-calendar/commit/560809dd5c0a7d3e0709883ff4013b70ae030fc7))
* bulk event import + one-way Google Calendar sync ([bb58c62](https://github.com/Shir0o/shared-calendar/commit/bb58c62f1dc66c19b0fbdfeed819efa4b1e746c2))
* bulk event import and Google Calendar sync ([b8f0281](https://github.com/Shir0o/shared-calendar/commit/b8f0281ed2948a64351161b0bbae885161cf7847))
* connect multiple Google Calendars ([b4a3bf9](https://github.com/Shir0o/shared-calendar/commit/b4a3bf9ef621b18102b29c5c8273272de870cbdb))
* connect multiple Google Calendars ([315d7be](https://github.com/Shir0o/shared-calendar/commit/315d7bed5c5917f004203aeaef7e60d40d19755b))
* display Sunday as first column in calendar views ([6f3395b](https://github.com/Shir0o/shared-calendar/commit/6f3395b2bf021fcff7080c8c0adfc2c63067140d))
* editable category labels/hues + orphaned gcal-feed recovery ([91d95b8](https://github.com/Shir0o/shared-calendar/commit/91d95b8f4798409c184a626da0e29f743d84338f))
* hide Timeline view, fix topbar overlap, vary sidebar width by view ([2fc4c74](https://github.com/Shir0o/shared-calendar/commit/2fc4c740969bbc1770561371352f0c886e61c611))
* implement SoftSchedule team calendar SPA ([b7df62e](https://github.com/Shir0o/shared-calendar/commit/b7df62e161d9670d6e6b0ef4e0069db8ade10213))
* **mcp:** expose the calendar to Claude over stdio and OAuth HTTP ([#59](https://github.com/Shir0o/shared-calendar/issues/59)) ([a835339](https://github.com/Shir0o/shared-calendar/commit/a83533938e6a9895fea011e36187d9348d03be4f))
* mobile shell + YEARLY/MONTHLY-BYDAY recurrence support ([923809a](https://github.com/Shir0o/shared-calendar/commit/923809a0ca29e3cea7f7ba21b789762bf27c4724))
* multi-day all-day events + custom duration + per-instance recurrence edits ([d6f5cf2](https://github.com/Shir0o/shared-calendar/commit/d6f5cf2082527a1088e8e748c4948537e304c9f2))
* multi-day all-day events, custom duration, per-instance recurrence edits ([3866bdc](https://github.com/Shir0o/shared-calendar/commit/3866bdc92fa875b516d04e6af818af721bdbac22))
* restrict Google login to owner-managed allowlist ([25f7c5c](https://github.com/Shir0o/shared-calendar/commit/25f7c5c3957dd4eb177d94ae5045f60a18c59e01))
* shared event calendar with Firebase auth + Cloudflare hosting ([7b3141e](https://github.com/Shir0o/shared-calendar/commit/7b3141eb8f55627a38f05fabe8419c755d3d9a6e))
* specify event calendar origin and feed label ([5ac2fa7](https://github.com/Shir0o/shared-calendar/commit/5ac2fa7c75e0d642c44ae1234ae65f67b292c0b6))
* specify event calendar origin and feed label ([a15b08e](https://github.com/Shir0o/shared-calendar/commit/a15b08e35b2461d36d6ceb3b3dab62284d6a572d))
* treat simultaneous events as normal ([a34f18e](https://github.com/Shir0o/shared-calendar/commit/a34f18efa1074c34479d80035d36baeb5c69dd7b))
* treat simultaneous events as normal ([e3f700c](https://github.com/Shir0o/shared-calendar/commit/e3f700c45792fd58190d53615d22b1667bddd4bd))


### Bug Fixes

* address PR review (admin doc lookup, CSV quoting, fetch timeout) ([aab73cf](https://github.com/Shir0o/shared-calendar/commit/aab73cf37c6c0e6c9d2f17b62f82db3d1f67b169))
* address PR review (atomic instance detach, stable onClose) ([ad5c46e](https://github.com/Shir0o/shared-calendar/commit/ad5c46e8e8e795b100fab503fd38e064c763ff79))
* address PR review (gcalConnect regression + .select projection) ([c82f4d1](https://github.com/Shir0o/shared-calendar/commit/c82f4d134afa7d7a9e0f6d2cb080b5a95eb05c26))
* address PR review (nested merge, atomic disconnect, paginated purge) ([35d5d1e](https://github.com/Shir0o/shared-calendar/commit/35d5d1e4016ef7caf7b547e91a2325cd82612033))
* address PR review feedback ([8ec7f8b](https://github.com/Shir0o/shared-calendar/commit/8ec7f8b18e43bd7a8811d5dac624b33e020a448f))
* **ci:** allow GITHUB_TOKEN fallback for release-please ([#64](https://github.com/Shir0o/shared-calendar/issues/64)) ([fa82845](https://github.com/Shir0o/shared-calendar/commit/fa82845a1729673db4ad076489e38ce2cd300bab))
* **deps:** bump @babel/core and protobufjs (alerts [#10](https://github.com/Shir0o/shared-calendar/issues/10), [#13](https://github.com/Shir0o/shared-calendar/issues/13), [#17](https://github.com/Shir0o/shared-calendar/issues/17)) ([#52](https://github.com/Shir0o/shared-calendar/issues/52)) ([d095973](https://github.com/Shir0o/shared-calendar/commit/d095973762ec06ab2ce432003925123926048c8f))
* **deps:** bump @grpc/grpc-js to &gt;=1.13.6 via override (alerts [#35](https://github.com/Shir0o/shared-calendar/issues/35), [#36](https://github.com/Shir0o/shared-calendar/issues/36)) ([#46](https://github.com/Shir0o/shared-calendar/issues/46)) ([7497b91](https://github.com/Shir0o/shared-calendar/commit/7497b91ed7e90810c4359652b9325e412d7b1280))
* **deps:** bump glob and minimatch in functions (alerts [#48](https://github.com/Shir0o/shared-calendar/issues/48), [#49](https://github.com/Shir0o/shared-calendar/issues/49)) ([#50](https://github.com/Shir0o/shared-calendar/issues/50)) ([be7b7cb](https://github.com/Shir0o/shared-calendar/commit/be7b7cb51af27b6c5200ef34c6625df6ecd3a584))
* **deps:** bump minimatch to &gt;=11.0.1 via override (alert [#47](https://github.com/Shir0o/shared-calendar/issues/47)) ([#49](https://github.com/Shir0o/shared-calendar/issues/49)) ([57ece95](https://github.com/Shir0o/shared-calendar/commit/57ece95e19c5db522d051651ebbe77c65ed81844))
* **deps:** override qs and uuid in functions (alerts [#1](https://github.com/Shir0o/shared-calendar/issues/1), [#8](https://github.com/Shir0o/shared-calendar/issues/8), [#46](https://github.com/Shir0o/shared-calendar/issues/46)) ([#48](https://github.com/Shir0o/shared-calendar/issues/48)) ([63d6d29](https://github.com/Shir0o/shared-calendar/commit/63d6d29fa736635cddb91729d2cea8dcb5013d39))
* **deps:** update vulnerable dependencies via npm audit fix ([#43](https://github.com/Shir0o/shared-calendar/issues/43)) ([06395e7](https://github.com/Shir0o/shared-calendar/commit/06395e7bb522f23c0cc4f1bd3c97f01d574978ee))
* guard view shortcuts against modifiers, respect reduced motion ([d6574c1](https://github.com/Shir0o/shared-calendar/commit/d6574c104549aa3d735ad3b97c900ce1c846e358))
* harden add-admin form (loading state, error handling, submit) ([f0eb0b7](https://github.com/Shir0o/shared-calendar/commit/f0eb0b7121d578fb32093e2d8490f11d829b6284))
* make all-day event imports timezone-agnostic ([292d216](https://github.com/Shir0o/shared-calendar/commit/292d216077c9e5fe7acbdb5895781de9f5004a20))
* make all-day event imports timezone-agnostic ([a13c140](https://github.com/Shir0o/shared-calendar/commit/a13c140a55879c4914a02d020782d9581f4b859b))
* PR review feedback for multi-calendar UI ([2b00a5e](https://github.com/Shir0o/shared-calendar/commit/2b00a5e9acaa9baffb9612ff547af6e6b8398e20))
* rename Topbar.tsx to TopBar.tsx to match import casing ([e85ab9a](https://github.com/Shir0o/shared-calendar/commit/e85ab9a063c8cb28559d0eaf66e19de957f26594))
* replace missing OkResult type with inline shape ([8b6d367](https://github.com/Shir0o/shared-calendar/commit/8b6d3675a7b867cca81de88adaf5106afe4247ba))
* **ui:** improve dark mode text contrast and color scheme ([#63](https://github.com/Shir0o/shared-calendar/issues/63)) ([0890f51](https://github.com/Shir0o/shared-calendar/commit/0890f51d88d879b2904a23768e88931ec3ba52bb))
* update Firebase storage bucket to firebasestorage.app domain ([52fdd9e](https://github.com/Shir0o/shared-calendar/commit/52fdd9e79b0b37cd54ea3c7130795d9b8a94b79f))
* update Firebase storage bucket to firebasestorage.app domain ([d94b5e5](https://github.com/Shir0o/shared-calendar/commit/d94b5e591637b8d858e18183e3f84ece8429e18f))


### Performance

* batch event deletes for bulk-import undo ([124039e](https://github.com/Shir0o/shared-calendar/commit/124039e11920bc12f1f87a19d7c98e7ddb20c718))
* **gcal:** skip Firestore writes when ICS LAST-MODIFIED is unchanged ([7e4430e](https://github.com/Shir0o/shared-calendar/commit/7e4430efc51ad81aeded289c698b2642aaf0e600))


### Refactoring

* address review comments on timezone logic and test reuse ([2dd7894](https://github.com/Shir0o/shared-calendar/commit/2dd7894e1fa40149c7a0db1a7a6958c35603fa69))
* scope GCal sync per feed (N=1 case) ([248eb43](https://github.com/Shir0o/shared-calendar/commit/248eb43a2332ad1f555687a54927d0262cd94332))
* scope GCal sync per feed (N=1 case) ([1bafc85](https://github.com/Shir0o/shared-calendar/commit/1bafc85dc283d52a960848ff1311481ad99a9c8d))
