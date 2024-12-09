# Use the official Node.js 22 Alpine image for a lightweight base
FROM node:22-alpine

# Create a non-root user 'aflab' with a home directory
RUN addgroup -S aflab && adduser -S aflab -G aflab

# Set environment variable for home directory
ENV HOME=/home/aflab

# Set the working directory to the home directory of 'aflab' user
WORKDIR $HOME

# Copy package.json and package-lock.json to install dependencies
COPY package*.json ./

# Install production dependencies
RUN npm install --production --ignore-scripts

# Copy the built source files from dist/src to the home directory
COPY dist/src/ $HOME/

# Copy the .env file to the home directory of 'aflab' user
COPY .env $HOME/

# Change ownership of the home directory to 'aflab' user
RUN chown -R aflab:aflab "$HOME"

# Switch to 'aflab' user for running the application
USER aflab

# Set the log level (overrided by .env file)
ENV LOG_LEVEL=info

# Define the command to run the application
CMD ["node", "start.js"]
