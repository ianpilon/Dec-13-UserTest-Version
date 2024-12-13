#!/usr/bin/env bash

# Download and run nvm installation script
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Source nvm in the current shell
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install Node.js LTS version
nvm install --lts

# Use the installed version
nvm use --lts

# Verify installation
node --version
npm --version
