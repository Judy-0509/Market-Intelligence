# Convenience targets for the Market Intelligence (Next.js) container.
IMAGE     ?= market-intelligence
TAG       ?= latest
HOST_PORT ?= 3000

.PHONY: install dev build start docker-build run stop logs sh push

install:          ## Install dependencies
	npm install

dev: install      ## Run the dev server (hot reload)
	npm run dev

build: install    ## Production build
	npm run build

start: build      ## Run the production server locally
	npm start

docker-build:     ## Build the Docker image
	docker build -t $(IMAGE):$(TAG) .

run: docker-build ## Build and run the container
	docker run -d --name $(IMAGE) -p $(HOST_PORT):3000 \
		-v $(PWD)/content/reports:/app/content/reports:ro \
		--security-opt no-new-privileges $(IMAGE):$(TAG)
	@echo "→ http://localhost:$(HOST_PORT)"

stop:             ## Stop and remove the container
	-docker rm -f $(IMAGE)

logs:             ## Tail container logs
	docker logs -f $(IMAGE)

sh:               ## Shell into the running container
	docker exec -it $(IMAGE) sh

push:             ## Push image to a registry (set REGISTRY=registry.corp.example/team)
	@test -n "$(REGISTRY)" || (echo "set REGISTRY=..." && exit 1)
	docker tag $(IMAGE):$(TAG) $(REGISTRY)/$(IMAGE):$(TAG)
	docker push $(REGISTRY)/$(IMAGE):$(TAG)
