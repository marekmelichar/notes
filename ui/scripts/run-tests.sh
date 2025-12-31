#!/usr/bin/env bash
set -e

NAME="$1"
GREP="$2"
TAG="${2:1}"
EVENT_TAG="${EVENT_TAG:-}"  # This ensures EVENT_TAG is defined, even if empty

# Determine extra tag automatically based on GitLab trigger if not provided
if [ -z "$EVENT_TAG" ] && [ -n "$CI_PIPELINE_SOURCE" ]; then
  if [ "$CI_PIPELINE_SOURCE" = "schedule" ]; then
    EVENT_TAG="Cron_schedule"
  else
    EVENT_TAG="Manual_run"
  fi
fi

# Clean results directory
mkdir -p results
rm -rf results/* || true


npx testmo automation:run:submit \
  --instance "$TESTMO_URL" \
  --project-id "$TESTMO_ID" \
  --name "$NAME $EVENT_TAG" \
  --source "GitLab-CI" \
  --resources scripts/testmoMapping.json \
  --results results/**/*.xml \
  --tags "$TAG" \
  --tags "$EVENT_TAG" \
  -- npx playwright test --grep "$GREP" --workers=1