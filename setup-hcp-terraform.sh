#!/bin/bash
set -e

# Cleanup existing resources if they exist
echo "Cleaning up existing resources..."

# Delete workspaces if they exist
for workspace in phase-01-terramino phase-02-terramino phase-03-terramino; do
  WORKSPACE_ID=$(tfctl get workspaces --organization hashicorp-learn --json 2>/dev/null | jq -r ".data[] | select(.attributes.name == \"$workspace\") | .id" || echo "")
  if [ -n "$WORKSPACE_ID" ]; then
    echo "Deleting workspace: $workspace ($WORKSPACE_ID)"
    tfctl harness exec --allow-delete=workspaces -- tfctl api /workspaces/$WORKSPACE_ID -X DELETE
  else
    echo "Workspace $workspace does not exist, skipping..."
  fi
done

# Delete project if it exists
# PROJECT_ID=$(tfctl get projects --organization hashicorp-learn --all --json 2>/dev/null | jq -r '.data[] | select(.attributes.name == "terramino-lab") | .id' || echo "")
# if [ -n "$PROJECT_ID" ]; then
#   echo "Deleting project: terramino-lab ($PROJECT_ID)"
#   tfctl harness exec --allow-delete=projects -- tfctl api /projects/$PROJECT_ID -X DELETE
# else
#   echo "Project terramino-lab does not exist, skipping..."
# fi

echo "Cleanup complete!"
echo ""
