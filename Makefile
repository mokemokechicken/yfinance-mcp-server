.PHONY: build test lint publish check typecheck prepare check-all

build:
	npm run build

test:
	npm test

lint:
	npm run lint

check:
	npm run check

typecheck: 
	npm run typecheck

check-all: build test lint check typecheck

prepare: check-all
	npm pack --dry-run

publish: build test lint
	npm publish --access public