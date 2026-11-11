.PHONY: verify

verify:
	npm run lint
	npm test
	npm --prefix mcp run typecheck
