.PHONY: build test lint publish

build:
	npm run build

test:
	npm test

lint:
	npm run check

prepare: build test lint
	npm pack --dry-run

publish: build test lint
	npm publish --access public