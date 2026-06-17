# Convenience targets for the Market Intelligence frontend container.
IMAGE     ?= market-intelligence
TAG       ?= latest
HOST_PORT ?= 8080

.PHONY: build run stop logs sh push dev

build:            ## Build the Docker image
	docker build -t $(IMAGE):$(TAG) .

run: build        ## Build and run the container
	docker run -d --name $(IMAGE) -p $(HOST_PORT):8080 \
		--read-only --tmpfs /tmp --security-opt no-new-privileges \
		$(IMAGE):$(TAG)
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

dev:              ## Serve locally without Docker (python http server)
	python -m http.server $(HOST_PORT)
