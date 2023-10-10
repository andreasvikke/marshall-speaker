#!/usr/bin/env bash

podman build . -t homey-dev
podman run --rm -it -v ./:/app --name homey-dev homey-dev
