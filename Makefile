.PHONY: build test lint publish

build:
	npm run build

test:
	npm test

lint:
	npm run check

publish: build test lint
	npm publish --access public