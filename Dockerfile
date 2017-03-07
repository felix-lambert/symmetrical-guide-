FROM mhart/alpine-node:6.7

# Create app directory
WORKDIR /src

# Bundle app source
COPY . .

CMD [ "npm", "run",  "aws" ]