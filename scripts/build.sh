#!/usr/bin/env bash

set -e

mkdir -p ./lib
mkdir -p ./examples

babel src/ -d .
